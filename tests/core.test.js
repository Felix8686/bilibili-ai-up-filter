"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "..", "bilibili-ai-up-filter.user.js");
const source = fs.readFileSync(scriptPath, "utf8");
const sandbox = { __BAF_TEST_MODE__: true };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: scriptPath });

const api = sandbox.__BAF_TEST_API__;

test("extracts BVID and UP UID from Bilibili URLs", () => {
  assert.equal(api.extractBvid("https://www.bilibili.com/video/BV1Ab411c7mD?p=1"), "BV1Ab411c7mD");
  assert.equal(api.extractBvid("https://www.bilibili.com/read/cv1"), "");
  assert.equal(api.extractUid("https://space.bilibili.com/123456/video"), "123456");
  assert.equal(api.extractUid("https://www.bilibili.com/"), "");
});

test("normalizes text and rejects unsupported providers", () => {
  assert.equal(api.normalizeText("  测试\n\t标题  "), "测试 标题");
  const settings = api.normalizeSettings({
    enabled: false,
    monitoringPaused: true,
    description: "  擦边内容  ",
    provider: "unknown",
    models: {},
  });
  assert.equal(settings.enabled, false);
  assert.equal(settings.monitoringPaused, true);
  assert.equal(settings.description, "擦边内容");
  assert.equal(settings.provider, "deepseek");
  assert.equal(settings.models.deepseek, "deepseek-v4-flash");
});

test("parses strict JSON model results including fenced output", () => {
  const results = api.parseModelResults(
    '```json\n{"results":[{"id":"i1","match":true,"confidence":0.91,"reason":"语义命中"},{"id":"i2","match":false,"confidence":0.2,"reason":"不匹配"}]}\n```',
    ["i1", "i2"]
  );
  assert.equal(results.length, 2);
  assert.deepEqual(
    JSON.parse(JSON.stringify(results[0])),
    { id: "i1", match: true, confidence: 0.91, reason: "语义命中" }
  );
});

test("uses a low initial classification budget and a bounded recovery budget", () => {
  assert.equal(api.getClassificationTokenBudget(1), 190);
  assert.equal(api.getClassificationTokenBudget(10), 820);
  assert.equal(api.getClassificationTokenBudget(100), 900);
  assert.equal(api.getClassificationTokenBudget(1, true), 1200);
  assert.equal(api.getClassificationTokenBudget(10, true), 2040);
  assert.equal(api.getClassificationTokenBudget(100, true), 2400);
  assert.equal(api.getStructuredRecoveryTokenBudget(960), 1200);
  assert.equal(api.getStructuredRecoveryTokenBudget(1650), 1650);
  assert.equal(api.getStructuredRecoveryTokenBudget(9999), 2400);
});

test("diagnoses empty and truncated structured model responses", () => {
  const emptyInfo = api.getModelResponseInfo({
    choices: [{ finish_reason: "stop", message: { content: "" } }],
  });
  assert.equal(emptyInfo.hasText, false);
  assert.equal(emptyInfo.finishReason, "stop");

  const error = api.createStructuredOutputError(
    new Error("模型结果中没有 JSON 对象"),
    {
      choices: [{ finish_reason: "length", message: { content: '{"results":[' } }],
      usage: {
        completion_tokens: 1200,
        completion_tokens_details: { reasoning_tokens: 1000 },
      },
    }
  );
  assert.match(error.message, /JSON 输出被截断/);
  assert.equal(error.parseFailure, true);
  assert.equal(error.finishReason, "length");
  assert.equal(error.reasoningTokens, 1000);
});

test("does not requeue structured output failures with unchanged parameters", () => {
  assert.equal(api.isRetryableBatchError({ status: 0, parseFailure: true }), false);
  assert.equal(api.isRetryableBatchError({ status: 0 }), true);
  assert.equal(api.isRetryableBatchError({ status: 429 }), true);
  assert.equal(api.isRetryableBatchError({ status: 503 }), true);
  assert.equal(api.isRetryableBatchError({ status: 400 }), false);
});

test("parses and normalizes AI learning results", () => {
  const result = api.parseLearningResult(
    '```json\n{"analysis":"偏好回避夸张猎奇标题","traits":["夸张猎奇","制造焦虑"],"learnedProfile":"不喜欢依靠夸张猎奇或制造焦虑吸引点击的视频"}\n```'
  );
  assert.equal(result.analysis, "偏好回避夸张猎奇标题");
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.traits)),
    ["夸张猎奇", "制造焦虑"]
  );
  assert.match(result.learnedProfile, /夸张猎奇/);
});

test("accepts conservative aliases in AI learning results", () => {
  const result = api.parseLearningResult(
    '{"summary":"规避焦虑营销","features":["焦虑营销","卖课"],"learned_profile":"不喜欢制造焦虑并推销课程的视频"}'
  );
  assert.equal(result.analysis, "规避焦虑营销");
  assert.deepEqual(JSON.parse(JSON.stringify(result.traits)), ["焦虑营销", "卖课"]);
  assert.match(result.learnedProfile, /推销课程/);
});

test("rejects incomplete AI learning results", () => {
  assert.throws(
    () => api.parseLearningResult('{"analysis":"只有分析","traits":[]}'),
    /学习结果格式/
  );
});

test("normalizes manual dislike samples and drops invalid BVIDs", () => {
  const learning = api.normalizeLearning({
    learnedProfile: "  不喜欢标题党  ",
    updatedAt: "2026-07-14T02:00:00.000Z",
    samples: {
      good: {
        bvid: "BV1Good001",
        title: "  测试\n标题  ",
        uid: "123",
        upName: "测试 UP",
        addedAt: "2026-07-14T01:00:00.000Z",
        traits: [" 标题党 ", "夸张"],
      },
      bad: { bvid: "av123", title: "无效" },
    },
  });
  assert.equal(learning.learnedProfile, "不喜欢标题党");
  assert.equal(Object.keys(learning.samples).length, 1);
  assert.equal(learning.samples.BV1Good001.title, "测试 标题");
});

test("matches normalized keyword and regex title rules", () => {
  assert.equal(api.matchTitleRules("这是一个ＭＢＴＩ测试", ["mbti"]), "mbti");
  assert.equal(api.matchTitleRules("教你月入十万", ["/月入|日赚/"]), "/月入|日赚/");
  assert.equal(api.matchTitleRules("普通科普", ["/[invalid/"]), "");
});

test("normalizes UP whitelist and local rule lists", () => {
  const rules = api.normalizeRules({
    titleBlacklist: [" 卖课 ", "卖课", "/月入|日赚/"],
    titleWhitelist: ["官方纪录片"],
    upWhitelist: {
      valid: { uid: "123", name: "优质 UP", addedAt: "2026-07-14T00:00:00.000Z" },
      invalid: { uid: "abc", name: "无效" },
    },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(rules.titleBlacklist)), ["卖课", "/月入|日赚/"]);
  assert.equal(Object.keys(rules.upWhitelist).length, 1);
  assert.equal(rules.upWhitelist["123"].name, "优质 UP");
});

test("parses AI candidate rules without enabling them", () => {
  const result = api.parseRuleSuggestions(
    '{"blacklist":["卖课","/月入|日赚/"],"whitelist":["官方纪录片"]}'
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result.blacklist)), ["卖课", "/月入|日赚/"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.whitelist)), ["官方纪录片"]);
});

test("accepts conservative aliases in AI candidate rules", () => {
  const result = api.parseRuleSuggestions(
    '{"titleBlacklist":["卖课"],"titleWhitelist":["官方纪录片"]}'
  );
  assert.deepEqual(JSON.parse(JSON.stringify(result.blacklist)), ["卖课"]);
  assert.deepEqual(JSON.parse(JSON.stringify(result.whitelist)), ["官方纪录片"]);
});

test("changes the AI cache criteria key only when semantic criteria change", () => {
  const settings = {
    enabled: true,
    description: "标题党",
    provider: "deepseek",
    models: { deepseek: "deepseek-v4-flash" },
  };
  const base = api.createCriteriaKey(settings, { samples: {}, learnedProfile: "" });
  const same = api.createCriteriaKey({ ...settings, enabled: false }, { samples: {}, learnedProfile: "" });
  const changed = api.createCriteriaKey({ ...settings, description: "卖课" }, { samples: {}, learnedProfile: "" });
  assert.equal(base, same);
  assert.notEqual(base, changed);
});

test("rejects model output that omits an expected item", () => {
  assert.throws(
    () => api.parseModelResults(
      '{"results":[{"id":"i1","match":false,"confidence":0.1,"reason":"否"}]}',
      ["i1", "i2"]
    ),
    /全部视频/
  );
});

test("validates backups and normalizes blacklist entries", () => {
  const backup = api.validateBackup({
    schemaVersion: 1,
    settings: {
      enabled: true,
      description: "标题党",
      provider: "aihubmix",
      models: { aihubmix: "gpt-4o-mini" },
    },
    blacklist: [
      {
        uid: "123",
        name: "测试 UP",
        sourceTitle: "测试标题",
        reason: "命中",
        addedAt: "2026-07-14T00:00:00.000Z",
        source: "ai",
      },
    ],
  });
  assert.equal(backup.settings.provider, "aihubmix");
  assert.equal(backup.blacklist[0].uid, "123");
  assert.equal(Object.hasOwn(backup, "secrets"), false);
});

test("creates backups without any API key field", () => {
  const backup = api.createBackup(
    {
      enabled: true,
      description: "标题党",
      provider: "deepseek",
      models: { deepseek: "deepseek-v4-flash" },
    },
    {
      entries: {
        123: {
          uid: "123",
          name: "测试 UP",
          addedAt: "2026-07-14T00:00:00.000Z",
        },
      },
    },
    "2026-07-14T01:00:00.000Z",
    {
      learnedProfile: "不喜欢标题党",
      updatedAt: "2026-07-14T00:30:00.000Z",
      samples: {
        BV1Sample01: {
          bvid: "BV1Sample01",
          title: "夸张标题示例",
          addedAt: "2026-07-14T00:20:00.000Z",
        },
      },
    },
    {
      titleBlacklist: ["卖课"],
      titleWhitelist: ["官方纪录片"],
      upWhitelist: {
        456: {
          uid: "456",
          name: "优质 UP",
          addedAt: "2026-07-14T00:40:00.000Z",
        },
      },
    }
  );
  const serialized = JSON.stringify(backup);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(backup.blacklist.length, 1);
  assert.equal(backup.schemaVersion, 3);
  assert.equal(backup.learning.samples.BV1Sample01.title, "夸张标题示例");
  assert.deepEqual(JSON.parse(JSON.stringify(backup.rules.titleBlacklist)), ["卖课"]);
  assert.equal(backup.rules.upWhitelist["456"].name, "优质 UP");
  assert.equal(serialized.includes("aiCache"), false);
});

test("uses the fixed 0.80 confidence threshold", () => {
  assert.equal(api.isConfidentMatch({ match: true, confidence: 0.8 }), true);
  assert.equal(api.isConfidentMatch({ match: true, confidence: 0.799 }), false);
  assert.equal(api.isConfidentMatch({ match: false, confidence: 1 }), false);
});

test("rejects backups containing invalid blacklist UIDs", () => {
  assert.throws(
    () => api.validateBackup({
      schemaVersion: 1,
      settings: {},
      blacklist: [{ uid: "not-a-uid" }],
    }),
    /无效 UID/
  );
});
