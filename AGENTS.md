<h1>B站 / YouTube 首页 AI 视频过滤器：项目代理说明</h1>

<h2>默认语言与文档格式</h2>

<p>项目说明、更新日志和发布文档默认使用中文。面向用户的文档必须使用 HTML，即使文件扩展名为 <code>.md</code>。</p>

<h2>版本发布完成标准</h2>

<p>除非用户明确要求仅保留本地改动，否则新版本只有在 GitHub 与 Greasy Fork 均完成更新并验证版本一致后，才算发布完成。不得只提交本地改动，也不得只推送 GitHub 后结束任务。</p>

<ol>
  <li>运行 JavaScript 语法检查、核心测试和适用的回归测试。</li>
  <li>递增用户脚本中的 <code>@version</code>。</li>
  <li>同步更新 <code>README.md</code>、<code>CHANGELOG.md</code> 和 <code>GREASYFORK_DESCRIPTION.html</code>。</li>
  <li>检查差异，创建 Conventional Commits 风格的提交和对应版本标签。</li>
  <li>将主分支及版本标签推送到 GitHub。</li>
  <li>将同一版本的脚本代码同步到 Greasy Fork。</li>
  <li>如功能说明发生变化，同步更新 Greasy Fork 的“附加信息”。</li>
  <li>打开两个发布页面，确认版本号、代码和更新说明一致。</li>
</ol>

<h2>发布地址</h2>

<ul>
  <li>GitHub：<a href="https://github.com/Felix8686/bilibili-ai-up-filter">https://github.com/Felix8686/bilibili-ai-up-filter</a></li>
  <li>Greasy Fork：<a href="https://greasyfork.org/zh-CN/scripts/587116-b%E7%AB%99%E9%A6%96%E9%A1%B5-ai-up-%E4%B8%BB%E8%BF%87%E6%BB%A4%E5%99%A8">https://greasyfork.org/zh-CN/scripts/587116</a></li>
  <li>Greasy Fork 源码同步地址：<a href="https://raw.githubusercontent.com/Felix8686/bilibili-ai-up-filter/main/bilibili-ai-up-filter.user.js">GitHub Raw 用户脚本</a></li>
</ul>

<h2>安全要求</h2>

<p>严禁提交 API Key、浏览器登录信息、Cookie、令牌或其他凭据。Greasy Fork 的登录授权由用户在浏览器中完成；代理只在已获授权且具备安全操作条件时执行页面更新。</p>
