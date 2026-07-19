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

test("extracts BV and AV video IDs from direct and encoded links", () => {
  assert.equal(
    api.extractVideoId("https://www.bilibili.com/video/av116921425004164?spm_id_from=333.1007"),
    "av116921425004164"
  );
  assert.equal(api.extractVideoId("AV123456"), "av123456");
  assert.equal(
    api.extractVideoId("https://example.com/jump?url=https%3A%2F%2Fwww.bilibili.com%2Fvideo%2FBV1Ab411c7mD%3Fp%3D1"),
    "BV1Ab411c7mD"
  );
  assert.equal(api.extractVideoId("https://www.bilibili.com/bangumi/play/ep123"), "");
  assert.equal(api.extractBvid("https://www.bilibili.com/video/av123456"), "");
});

test("extracts namespaced YouTube video and creator IDs", () => {
  assert.equal(
    api.extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10"),
    "yt:dQw4w9WgXcQ"
  );
  assert.equal(api.extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ"), "yt:dQw4w9WgXcQ");
  assert.equal(api.extractVideoId("yt:dQw4w9WgXcQ"), "yt:dQw4w9WgXcQ");
  assert.equal(api.extractYouTubeVideoId("BV1Sample01"), "");
  assert.equal(api.extractVideoId("BV1Sample01"), "BV1Sample01");
  assert.equal(api.extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "");
  assert.equal(api.extractYouTubeCreatorId("https://www.youtube.com/@ExampleCreator/videos"), "yt:handle:examplecreator");
  assert.equal(api.extractYouTubeCreatorId("/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw"), "yt:channel:UC_x5XG1OV2P6uZZ5FSM9Ttw");
  assert.equal(api.isSupportedVideoId("yt:dQw4w9WgXcQ"), true);
  assert.equal(api.isSupportedCreatorId("yt:handle:examplecreator"), true);
});

test("limits both supported sites to their homepage", () => {
  assert.equal(api.resolveSiteId("www.bilibili.com"), "bilibili");
  assert.equal(api.resolveSiteId("www.youtube.com"), "youtube");
  assert.equal(api.isHomepageLocation("www.bilibili.com", "/"), true);
  assert.equal(api.isHomepageLocation("www.youtube.com", "/"), true);
  assert.equal(api.isHomepageLocation("www.youtube.com", "/feed/subscriptions"), false);
  assert.equal(api.isHomepageLocation("www.youtube.com", "/watch"), false);
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

test("provides mainstream domestic and overseas API providers", () => {
  const providers = api.getProviderCatalog();
  assert.deepEqual(
    Object.keys(providers),
    [
      "deepseek",
      "aihubmix",
      "openai",
      "gemini",
      "anthropic",
      "doubao",
      "qwen",
      "zhipu",
      "kimi",
      "hunyuan",
      "qianfan",
    ]
  );
  assert.equal(providers.openai.defaultModel, "gpt-5.6-luna");
  assert.equal(providers.gemini.endpoint.includes("generativelanguage.googleapis.com"), true);
  assert.equal(providers.anthropic.apiStyle, "anthropic");
  assert.equal(providers.doubao.defaultModel, "doubao-seed-2-0-lite-260215");
  assert.equal(providers.zhipu.defaultModel, "glm-4.7-flash");
  assert.equal(providers.qianfan.defaultModel, "ernie-5.0");
});

test("fills new provider models and keys while preserving old settings", () => {
  const settings = api.normalizeSettings({
    provider: "openai",
    models: {
      deepseek: "deepseek-custom",
      openai: " gpt-5.6-terra ",
    },
  });
  assert.equal(settings.provider, "openai");
  assert.equal(settings.models.deepseek, "deepseek-custom");
  assert.equal(settings.models.openai, "gpt-5.6-terra");
  assert.equal(settings.models.anthropic, "claude-haiku-4-5");
  assert.equal(settings.models.qwen, "qwen3.6-flash");

  const secrets = api.normalizeSecrets({
    keys: { deepseek: " old-key ", openai: " new-key " },
  });
  assert.equal(secrets.keys.deepseek, "old-key");
  assert.equal(secrets.keys.openai, "new-key");
  assert.equal(secrets.keys.anthropic, "");
  assert.equal(Object.keys(secrets.keys).length, Object.keys(api.getProviderCatalog()).length);
});

test("adapts OpenAI token and reasoning parameters without mutating the source body", () => {
  const sourceBody = {
    model: "gpt-5.6-luna",
    messages: [
      { role: "system", content: "Return JSON." },
      { role: "user", content: "Classify this." },
    ],
    temperature: 0,
    max_tokens: 190,
  };
  const request = api.buildProviderRequest("openai", "openai-key", sourceBody, true);
  assert.equal(request.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(request.headers.Authorization, "Bearer openai-key");
  assert.equal(request.body.max_completion_tokens, 190);
  assert.equal(Object.hasOwn(request.body, "max_tokens"), false);
  assert.equal(Object.hasOwn(request.body, "temperature"), false);
  assert.equal(request.body.reasoning_effort, "none");
  assert.deepEqual(
    JSON.parse(JSON.stringify(request.body.response_format)),
    { type: "json_object" }
  );
  assert.equal(sourceBody.max_tokens, 190);
  assert.equal(sourceBody.temperature, 0);
});

test("adapts Claude Messages requests and normalizes native responses", () => {
  const request = api.buildProviderRequest("anthropic", "claude-key", {
    model: "claude-haiku-4-5",
    messages: [
      { role: "system", content: "Return JSON." },
      { role: "user", content: "Classify this." },
    ],
    temperature: 0,
    max_tokens: 320,
  }, true);
  assert.equal(request.url, "https://api.anthropic.com/v1/messages");
  assert.equal(request.headers["x-api-key"], "claude-key");
  assert.equal(request.headers["anthropic-version"], "2023-06-01");
  assert.equal(Object.hasOwn(request.headers, "Authorization"), false);
  assert.equal(request.body.system, "Return JSON.");
  assert.deepEqual(
    JSON.parse(JSON.stringify(request.body.messages)),
    [{ role: "user", content: "Classify this." }]
  );
  assert.equal(request.body.max_tokens, 320);
  assert.equal(request.jsonModeApplied, false);

  const normalized = api.normalizeProviderResponse("anthropic", {
    content: [
      { type: "thinking", thinking: "hidden" },
      { type: "text", text: '{"results":[]}' },
    ],
    stop_reason: "max_tokens",
    usage: { input_tokens: 40, output_tokens: 12 },
  });
  assert.equal(normalized.choices[0].message.content, '{"results":[]}');
  assert.equal(normalized.choices[0].finish_reason, "length");
  assert.equal(normalized.usage.completion_tokens, 12);
});

test("applies token-saving options only where each compatible provider supports them", () => {
  const body = {
    model: "placeholder",
    messages: [{ role: "user", content: "Return JSON." }],
    temperature: 0,
    max_tokens: 550,
  };
  const qwen = api.buildProviderRequest("qwen", "key", {
    ...body,
    model: "qwen3.6-flash",
  }, true);
  assert.equal(qwen.body.max_tokens, 550);
  assert.equal(qwen.body.enable_thinking, false);
  assert.equal(qwen.jsonModeApplied, true);

  const kimi = api.buildProviderRequest("kimi", "key", {
    ...body,
    model: "kimi-k2.6",
  }, true);
  assert.equal(kimi.body.max_completion_tokens, 550);
  assert.deepEqual(
    JSON.parse(JSON.stringify(kimi.body.thinking)),
    { type: "disabled" }
  );

  const hunyuan = api.buildProviderRequest("hunyuan", "key", {
    ...body,
    model: "hunyuan-turbos-latest",
  }, true);
  assert.equal(hunyuan.body.max_tokens, 550);
  assert.equal(hunyuan.body.enable_enhancement, false);
  assert.equal(Object.hasOwn(hunyuan.body, "response_format"), false);
  assert.equal(hunyuan.jsonModeApplied, false);
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

test("normalizes BV and AV manual dislike samples and drops invalid IDs", () => {
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
      legacy: {
        bvid: "AV123",
        title: "旧式 AV 链接视频",
        addedAt: "2026-07-14T01:30:00.000Z",
      },
      bad: { bvid: "ep123", title: "无效" },
    },
  });
  assert.equal(learning.learnedProfile, "不喜欢标题党");
  assert.equal(Object.keys(learning.samples).length, 2);
  assert.equal(learning.samples.BV1Good001.title, "测试 标题");
  assert.equal(learning.samples.av123.title, "旧式 AV 链接视频");
});

test("normalizes YouTube learning samples and creator rules without changing Bilibili data", () => {
  const learning = api.normalizeLearning({
    samples: {
      youtube: {
        bvid: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        title: " YouTube 测试视频 ",
        uid: "yt:handle:examplecreator",
        upName: "Example Creator",
        addedAt: "2026-07-19T01:00:00.000Z",
      },
    },
  });
  assert.equal(learning.samples["yt:dQw4w9WgXcQ"].title, "YouTube 测试视频");
  assert.equal(learning.samples["yt:dQw4w9WgXcQ"].uid, "yt:handle:examplecreator");

  const rules = api.normalizeRules({
    upWhitelist: {
      youtube: {
        uid: "yt:channel:UC_x5XG1OV2P6uZZ5FSM9Ttw",
        name: "Google for Developers",
        addedAt: "2026-07-19T01:00:00.000Z",
      },
    },
  });
  assert.equal(
    rules.upWhitelist["yt:channel:UC_x5XG1OV2P6uZZ5FSM9Ttw"].name,
    "Google for Developers"
  );
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

test("rejects backups containing invalid creator IDs", () => {
  assert.throws(
    () => api.validateBackup({
      schemaVersion: 1,
      settings: {},
      blacklist: [{ uid: "not-a-uid" }],
    }),
    /无效创作者标识/
  );
});
