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
    description: "  擦边内容  ",
    provider: "unknown",
    models: {},
  });
  assert.equal(settings.enabled, false);
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
    "2026-07-14T01:00:00.000Z"
  );
  const serialized = JSON.stringify(backup);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(backup.blacklist.length, 1);
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
