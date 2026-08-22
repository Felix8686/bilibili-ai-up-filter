import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => readFileSync(path.join(root, file), "utf8");
const write = (file, content) => writeFileSync(path.join(root, file), content, "utf8");

function replaceRequired(content, pattern, replacement, label) {
  if (!pattern.test(content)) throw new Error(`未找到 ${label} 更新锚点`);
  return content.replace(pattern, replacement);
}

// 1. 版本与模型签名
let bootstrap = read("src/parts/00-bootstrap.js");
bootstrap = replaceRequired(
  bootstrap,
  /\/\/ @version\s+0\.7\.4/u,
  "// @version      0.7.5",
  "userscript version"
);
if (!bootstrap.includes("正式发布 v0.7.5")) {
  const anchor = "// AI-Model-Signature: Codex | 2026-08-20 | 支持撤销不喜欢样本并重建剩余偏好画像；发布 v0.7.4";
  bootstrap = replaceRequired(
    bootstrap,
    new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"),
    `${anchor}\n// AI-Model-Signature: gpt-5.6-sol | 2026-08-22 | 屏蔽 B 站首页推广视频并发布 v0.7.5`,
    "bootstrap model signature"
  );
}
write("src/parts/00-bootstrap.js", bootstrap);

// 2. README
let readme = read("README.md");
readme = replaceRequired(
  readme,
  /<p>当前版本：<strong>v0\.7\.4<\/strong><\/p>/u,
  "<p>当前版本：<strong>v0.7.5</strong></p>",
  "README current version"
);
if (!readme.includes("添加 v0.7.5 B 站首页推广视频屏蔽说明")) {
  readme = `<!-- AI-Model-Signature: gpt-5.6-sol | 2026-08-22 | 添加 v0.7.5 B 站首页推广视频屏蔽说明 -->\n${readme}`;
}
if (!readme.includes("B 站首页推广视频卡片会在本地直接识别并隐藏")) {
  readme = replaceRequired(
    readme,
    /(<li>只有本地规则和缓存无法确定时才调用 AI，减少 API token 消耗。<\/li>)/u,
    "$1\n    <li>B 站首页推广视频卡片会在本地直接识别并隐藏，不进入 AI 判断队列，也不会消耗 API token。</li>",
    "README feature list"
  );
}
if (!/<h2>v0\.7\.5 更新<\/h2>/u.test(readme)) {
  const section = [
    "  <h2>v0.7.5 更新</h2>",
    "  <ul>",
    "    <li>新增 B 站首页推广视频屏蔽：识别广告标记、推广链接、creative-ad、推广统计图标及 promotion 属性等多类信号。</li>",
    "    <li>推广卡片完全在本地处理，不进入 AI 分类、缓存或主动学习队列，避免额外 API 消耗。</li>",
    "    <li>支持首页首屏、换一换、无限滚动和动态插入的新推广卡片；关闭首页过滤时恢复显示。</li>",
    "    <li>状态摘要单独统计推广隐藏数量，并计入节省的 AI 判断次数。</li>",
    "  </ul>",
    "",
  ].join("\n");
  readme = replaceRequired(
    readme,
    /  <h2>v0\.7\.4 更新<\/h2>/u,
    `${section}  <h2>v0.7.4 更新</h2>`,
    "README v0.7.4 section"
  );
}
write("README.md", readme);

// 3. CHANGELOG
let changelog = read("CHANGELOG.md");
if (!changelog.includes("添加 v0.7.5 B 站首页推广视频屏蔽发布记录")) {
  changelog = `<!-- AI-Model-Signature: gpt-5.6-sol | 2026-08-22 | 添加 v0.7.5 B 站首页推广视频屏蔽发布记录 -->\n${changelog}`;
}
if (!/<h2>v0\.7\.5（2026-08-22）<\/h2>/u.test(changelog)) {
  const section = [
    "",
    "  <h2>v0.7.5（2026-08-22）</h2>",
    "  <p>新增 B 站首页推广视频本地屏蔽，避免推广内容进入 AI 判断。</p>",
    "  <ul>",
    "    <li>综合识别广告文案、推广链接、creative-ad、推广图标、promotion 属性等多类 B 站推广标记。</li>",
    "    <li>推广卡片在候选视频构建前即被排除，并直接使用现有隐藏机制处理，不写入 AI 缓存或主动学习数据。</li>",
    "    <li>复用首页 MutationObserver，兼容换一换、无限滚动和异步插入的推广卡片。</li>",
    "    <li>关闭首页过滤后推广卡片恢复显示；摘要新增推广隐藏与节省 AI 判断统计。</li>",
    "    <li>新增 B 站推广卡片浏览器集成回归测试。</li>",
    "  </ul>",
  ].join("\n");
  changelog = replaceRequired(
    changelog,
    /(<h1>版本记录<\/h1>)/u,
    `$1${section}`,
    "CHANGELOG title"
  );
}
write("CHANGELOG.md", changelog);

// 4. Greasy Fork 描述
let greasy = read("GREASYFORK_DESCRIPTION.html");
if (!greasy.includes("更新 v0.7.5 B 站首页推广视频屏蔽说明")) {
  greasy = `<!-- AI-Model-Signature: gpt-5.6-sol | 2026-08-22 | 更新 v0.7.5 B 站首页推广视频屏蔽说明 -->\n${greasy}`;
}
greasy = greasy.replace(
  /<p>当前版本：<strong>v0\.7\.4<\/strong><\/p>/u,
  "<p>当前版本：<strong>v0.7.5</strong></p>"
);
if (!greasy.includes("B 站首页推广视频会优先在本地识别并隐藏")) {
  greasy = replaceRequired(
    greasy,
    /(<li>只有本地规则和缓存无法确定时才调用 AI，减少 API token 消耗。<\/li>)/u,
    "$1\n    <li>B 站首页推广视频会优先在本地识别并隐藏，不发送给 AI，也不消耗 API token。</li>",
    "Greasy Fork feature list"
  );
}
if (!/<h2>v0\.7\.5 更新<\/h2>/u.test(greasy)) {
  const section = [
    "  <h2>v0.7.5 更新</h2>",
    "  <ul>",
    "    <li>新增 B 站首页推广视频屏蔽，覆盖多类广告/推广 DOM 标记。</li>",
    "    <li>推广卡片本地直接隐藏，不进入 AI 判断和学习队列。</li>",
    "    <li>兼容换一换、无限滚动及异步加载，并在摘要中显示推广隐藏数量。</li>",
    "  </ul>",
    "",
  ].join("\n");
  greasy = replaceRequired(
    greasy,
    /  <h2>v0\.7\.4 更新<\/h2>/u,
    `${section}  <h2>v0.7.4 更新</h2>`,
    "Greasy Fork v0.7.4 section"
  );
}
write("GREASYFORK_DESCRIPTION.html", greasy);

// 5. 重新生成单文件 userscript
const build = spawnSync(process.execPath, ["scripts/build-userscript.mjs", "--write"], {
  cwd: root,
  stdio: "inherit",
});
if (build.status !== 0) process.exit(build.status || 1);
