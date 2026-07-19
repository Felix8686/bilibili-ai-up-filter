<h1>B站 / YouTube 首页 AI 视频过滤器：项目代理说明</h1>

<h2>默认语言与文档格式</h2>

<p>项目说明、更新日志和发布文档默认使用中文。面向用户的文档必须使用 HTML，即使文件扩展名为 <code>.md</code>。</p>

<h2>版本发布完成标准</h2>

<p>除非用户明确要求仅保留本地改动，否则新版本在完成测试、版本与文档更新、提交和标签，并将主分支及版本标签推送到 GitHub 后，即视为发布完成。Greasy Fork 已配置从 GitHub Raw 自动同步，默认不再进行手动更新或逐次在线核验，以减少不必要的操作和 token 消耗。</p>

<ol>
  <li>运行 JavaScript 语法检查、核心测试和适用的回归测试。</li>
  <li>递增用户脚本中的 <code>@version</code>。</li>
  <li>同步更新 <code>README.md</code>、<code>CHANGELOG.md</code> 和 <code>GREASYFORK_DESCRIPTION.html</code>。</li>
  <li>检查差异，创建 Conventional Commits 风格的提交和对应版本标签。</li>
  <li>将主分支及版本标签推送到 GitHub。</li>
  <li>核验 GitHub 主分支、标签和 Raw 脚本中的版本号一致。</li>
</ol>

<h2>Greasy Fork 自动同步策略</h2>

<p>Greasy Fork 默认依靠现有的 GitHub Raw 源码同步配置获取新版本。除非用户明确要求、Greasy Fork 报告同步失败，或用户反馈线上版本长期未更新，否则代理不得为了常规发布而登录 Greasy Fork、手动触发同步或反复轮询其页面。</p>

<h2>发布地址</h2>

<ul>
  <li>GitHub：<a href="https://github.com/Felix8686/bilibili-ai-up-filter">https://github.com/Felix8686/bilibili-ai-up-filter</a></li>
  <li>Greasy Fork：<a href="https://greasyfork.org/zh-CN/scripts/587116-b%E7%AB%99%E9%A6%96%E9%A1%B5-ai-up-%E4%B8%BB%E8%BF%87%E6%BB%A4%E5%99%A8">https://greasyfork.org/zh-CN/scripts/587116</a></li>
  <li>Greasy Fork 源码同步地址：<a href="https://raw.githubusercontent.com/Felix8686/bilibili-ai-up-filter/main/bilibili-ai-up-filter.user.js">GitHub Raw 用户脚本</a></li>
</ul>

<h2>安全要求</h2>

<p>严禁提交 API Key、浏览器登录信息、Cookie、令牌或其他凭据。Greasy Fork 的登录授权由用户在浏览器中完成；代理只在已获授权且具备安全操作条件时执行页面更新。</p>
