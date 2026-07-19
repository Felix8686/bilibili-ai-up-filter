// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 无第三方依赖运行首页浏览器集成测试

import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const fixtures = [
  "tests/homepage-integration.html",
  "tests/youtube-homepage-integration.html",
  "tests/youtube-navigation-integration.html",
  "tests/youtube-trusted-types-integration.html",
  "tests/youtube-shadow-contextmenu-integration.html",
];

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === "win32" && process.env.ProgramFiles
      ? path.join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.platform === "win32" && process.env["ProgramFiles(x86)"]
      ? path.join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe")
      : "",
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
      : "",
    "google-chrome-stable",
    "google-chrome",
    "chromium",
    "chromium-browser",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (path.isAbsolute(candidate)) {
      if (existsSync(candidate)) return candidate;
      continue;
    }
    const probe = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (!probe.error && probe.status === 0) return candidate;
  }
  throw new Error("未找到 Chrome/Chromium。可通过 CHROME_PATH 指定浏览器路径。");
}

const chrome = findChrome();
let failures = 0;

for (const relativePath of fixtures) {
  const absolutePath = path.join(projectRoot, relativePath);
  const profile = mkdtempSync(path.join(tmpdir(), "baf-browser-test-"));
  const result = spawnSync(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-extensions",
    "--allow-file-access-from-files",
    "--virtual-time-budget=9000",
    `--user-data-dir=${profile}`,
    "--dump-dom",
    pathToFileURL(absolutePath).href,
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 30000,
    maxBuffer: 8 * 1024 * 1024,
  });
  rmSync(profile, { recursive: true, force: true });

  const dom = result.stdout || "";
  const passed = result.status === 0
    && /id="baf-test-result"[^>]*>PASS<\/div>/u.test(dom);
  if (passed) {
    console.log(`PASS ${relativePath}`);
    continue;
  }

  failures += 1;
  const details = dom.match(/id="baf-test-result"[^>]*data-details="([^"]*)"[^>]*>(?:FAIL|PENDING)<\/div>/u)?.[1]
    || "没有生成测试详情";
  console.error(`FAIL ${relativePath}: ${details}`);
  if (result.error) console.error(result.error.message);
  if (result.stderr) console.error(result.stderr.slice(-2000));
}

if (failures) process.exitCode = 1;
