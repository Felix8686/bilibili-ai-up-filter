// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 一条命令运行语法、核心和浏览器回归测试

import { spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const commands = [
  ["scripts/build-userscript.mjs", "--check"],
  ["--check", "bilibili-ai-up-filter.user.js"],
  ["--test", "tests/core.test.js"],
  ["tests/run-browser-tests.mjs"],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
