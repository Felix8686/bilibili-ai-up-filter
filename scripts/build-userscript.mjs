// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 从模块化片段生成并校验可直接安装的单文件用户脚本

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "bilibili-ai-up-filter.user.js");
const partsDirectory = path.join(projectRoot, "src", "parts");
const partNames = [
  "00-bootstrap.js",
  "10-storage-rules.js",
  "20-ui-shell.js",
  "21-ui-actions.js",
  "22-ui-data-backup.js",
  "30-homepage-adapters.js",
  "40-ai-queue-learning.js",
  "41-ai-providers.js",
  "42-runtime-tail.js",
];

const generated = partNames
  .map((fileName) => readFileSync(path.join(partsDirectory, fileName), "utf8").trimEnd())
  .join("\n\n")
  .concat("\n");

if (process.argv.includes("--check")) {
  const current = readFileSync(outputPath, "utf8");
  if (current !== generated) {
    console.error("安装脚本不是由当前 src/parts 生成的，请运行 node scripts/build-userscript.mjs --write");
    process.exit(1);
  }
  console.log("PASS 生成脚本与模块化源码一致");
} else if (process.argv.includes("--write")) {
  writeFileSync(outputPath, generated, "utf8");
  console.log("已生成 bilibili-ai-up-filter.user.js");
} else {
  console.log("使用 --check 校验，或使用 --write 重新生成安装脚本。");
}
