  <!-- AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 更新 v0.7.0 使用说明与发布记录 -->
  <h1>B站 / YouTube 首页 AI 视频过滤器</h1>

  <p>当前版本：<strong>v0.7.0</strong></p>
  <p>作者：<strong>Felix8686</strong></p>

  <p>这是一个 Tampermonkey 用户脚本。它会先用本地白名单、黑名单、标题关键词和正则规则判断 B 站及 YouTube 首页推荐；只有本地规则无法确定且没有可用缓存的视频，才会批量交给用户配置的 AI 接口进行语义判断。AI 命中只隐藏当前视频，不会自动永久拉黑整个创作者；同一创作者多次高置信度命中后，脚本会提示用户自行确认是否拉黑。</p>

  <h2>当前版本范围</h2>
  <ul>
    <li>处理 <code>https://www.bilibili.com/</code> 和 <code>https://www.youtube.com/</code> 首页。</li>
    <li>支持两站首页首屏、无限滚动，以及 B 站“换一换”和 YouTube 站内导航后产生的新卡片。</li>
    <li>支持在首页视频卡片上右键添加不喜欢样本，并自动生成 AI 偏好画像；兼容 B 站 BV、AV 链接和 YouTube <code>/watch?v=</code> 标准视频。</li>
    <li>支持右键手动拉黑创作者或加入创作者白名单。</li>
    <li>支持本地标题黑白名单，规则可以是普通关键词或 <code>/正则表达式/</code>。</li>
    <li>只观察首页推荐区域；离开首页后停止卡片扫描和 AI 队列。</li>
    <li>会拒绝可能造成网页卡顿的高风险正则表达式，并在保存时说明原因。</li>
    <li>YouTube Shorts、广告、频道标识缺失的卡片会保守跳过，不进入 AI 队列。</li>
    <li>不处理搜索页、排行榜、订阅页、视频播放页、B站 App 或观看历史。</li>
    <li>判断失败时保持视频显示，不会因为 API 故障自动拉黑。</li>
  </ul>

  <h2>安装</h2>
  <ol>
    <li>在 Chrome 或 Edge 安装 Tampermonkey。</li>
    <li>在 Tampermonkey 中新建脚本。</li>
    <li>复制 <code>bilibili-ai-up-filter.user.js</code> 的全部内容并保存。</li>
    <li>打开或刷新 B 站或 YouTube 首页，右下角会显示“AI 过滤”按钮。</li>
  </ol>

  <h2>配置</h2>
  <ol>
    <li>点击页面右下角“AI 过滤”，或使用 Tampermonkey 菜单中的“打开首页 AI 视频过滤设置”。</li>
    <li>填写要过滤的内容描述，例如“擦边、夸张猎奇、标题党的内容”。</li>
    <li>选择 API 服务商，填写或确认模型名，再填写该平台对应的 API Key。</li>
    <li>点击“测试连接”，确认接口可以返回脚本要求的 JSON。</li>
    <li>按需填写本地标题黑名单和白名单，每行一条关键词或 <code>/正则表达式/</code>。</li>
    <li>点击“保存”，脚本会开始判断首页推荐。</li>
  </ol>

  <h3>支持的 API 服务商</h3>
  <table>
    <thead>
      <tr><th>服务商</th><th>默认模型</th></tr>
    </thead>
    <tbody>
      <tr><td>DeepSeek</td><td><code>deepseek-v4-flash</code></td></tr>
      <tr><td>AiHubMix</td><td><code>gpt-4o-mini</code></td></tr>
      <tr><td>OpenAI</td><td><code>gpt-5.6-luna</code></td></tr>
      <tr><td>Google Gemini</td><td><code>gemini-3.5-flash</code></td></tr>
      <tr><td>Anthropic Claude</td><td><code>claude-haiku-4-5</code></td></tr>
      <tr><td>豆包（火山方舟）</td><td><code>doubao-seed-2-0-lite-260215</code></td></tr>
      <tr><td>阿里云百炼（通义千问）</td><td><code>qwen3.6-flash</code></td></tr>
      <tr><td>智谱 GLM</td><td><code>glm-4.7-flash</code></td></tr>
      <tr><td>Kimi（月之暗面）</td><td><code>kimi-k2.6</code></td></tr>
      <tr><td>腾讯混元</td><td><code>hunyuan-turbos-latest</code></td></tr>
      <tr><td>百度千帆（ERNIE）</td><td><code>ernie-5.0</code></td></tr>
    </tbody>
  </table>
  <p>脚本会自动适配各平台不同的请求地址、鉴权头、输出 token 参数和响应格式。默认模型以轻量、高速或低成本版本为主；如果服务商调整模型名称，或者账号已开通其他模型，可以直接在设置中修改。</p>

  <h2>本地规则与 AI 判断顺序</h2>
  <ol>
    <li>手动标记过“不喜欢”的视频 ID（BV、AV 或带 <code>yt:</code> 前缀的 YouTube ID）：隐藏当前视频。</li>
    <li>创作者白名单或标题白名单命中：保持显示，不再调用 AI。</li>
    <li>创作者黑名单或标题黑名单命中：直接隐藏，不再调用 AI。</li>
    <li>以上规则都无法确定时：读取当前过滤条件对应的 AI 判断缓存。</li>
    <li>仍无结果时：把视频加入批量 AI 判断队列。</li>
  </ol>
  <p>白名单会覆盖 AI 判断和普通黑名单规则。唯一例外是用户明确对某个具体视频执行了“不喜欢此视频”，该视频仍会隐藏。标题规则支持普通包含匹配，也支持用一对斜杠包围的正则表达式，例如 <code>/月入.*万/</code>。为避免浏览器卡死，包含危险回溯或连续无分隔可变量词的正则会被拒绝。</p>

  <h2>右键菜单与主动学习</h2>
  <ol>
    <li>在 B 站或 YouTube 首页的视频卡片上点击右键。</li>
    <li>选择“不喜欢此视频 · 隐藏并让 AI 学习”，只处理当前视频 ID。</li>
    <li>也可以选择“拉黑该创作者”，隐藏该创作者之后的首页推荐。</li>
    <li>对希望始终显示的作者选择“始终显示该创作者”，加入创作者白名单。</li>
    <li>规范化的视频 ID 会立即进入本地不喜欢样本并从首页隐藏。</li>
    <li>配置了 API Key 时，AI 会自动分析标题和创作者名称，提炼内容特征并更新偏好画像。</li>
    <li>后续首页推荐会同时参考手写过滤描述、偏好画像和近期不喜欢样本。</li>
  </ol>
  <p>AI 高置信度命中也只隐藏当前视频。同一创作者累计至少 3 个不同视频命中后，设置面板会显示“拉黑”或“忽略”建议，只有用户点击“拉黑”才会写入永久创作者黑名单。按住 <kbd>Shift</kbd> 再点击右键，可以使用浏览器原生右键菜单。未配置 API Key 时样本仍会保存，保存有效配置后会自动补充分析。</p>

  <h2>AI 提炼候选规则</h2>
  <p>点击设置面板中的“AI 提炼候选规则”，AI 会根据过滤描述、学习画像和最近样本建议可在本地运行的标题关键词。候选规则不会自动启用，用户必须逐条点击“采用”。采用后，后续命中由浏览器本地完成，不再为这些内容消耗 AI token。</p>

  <h2>暂停自动 AI 监视</h2>
  <ul>
    <li>浮动“AI 过滤”按钮右侧的 <code>⏸</code> 用于暂停自动 AI；暂停后按钮变为 <code>▶</code>，点击即可恢复。</li>
    <li>暂停状态会保存在 Tampermonkey 本地存储中，刷新页面后仍然保持。</li>
    <li>暂停期间，本地标题规则、创作者黑白名单、视频不喜欢样本和已有 AI 缓存继续生效；页面滚动和新推荐不会自动产生 API token 消耗。</li>
    <li>暂停期间右键标记“不喜欢”属于用户明确触发的操作：配置了 API Key 时仍会立即隐藏、分析并学习，但不会恢复首页自动监视。</li>
    <li>暂停前积压且未由用户再次操作的待学习样本会继续等待，恢复后才自动批量处理。</li>
    <li>“测试连接”和“AI 提炼候选规则”属于用户主动操作，即使暂停自动监视，也仍可手动调用。</li>
    <li>点击暂停前已经发送的单次请求可能已经产生 token；脚本会忽略它稍后返回的旧结果，并阻止后续自动队列。</li>
  </ul>

  <h2>Token 节省机制</h2>
  <ul>
    <li><strong>本地优先：</strong>白名单、创作者黑名单、视频不喜欢样本、标题关键词和正则规则都在浏览器内判断，命中时完全不调用 AI。</li>
    <li><strong>持久缓存：</strong>AI 对规范化视频 ID（BV、AV 或 <code>yt:</code>）的匹配和不匹配结果都会缓存在 Tampermonkey 本地存储中。过滤条件不变时，即使同一视频标题更新，刷新页面、无限滚动或卡片重新出现也可直接复用。</li>
    <li><strong>自动失效：</strong>缓存同时绑定 API 服务商、模型、过滤描述、学习画像及最近样本；这些语义条件变化后不会误用旧判断。缓存最多保留 600 条，当前版本不启用按 30 天过期。</li>
    <li><strong>只发模糊内容：</strong>只有本地规则无法确定且没有有效缓存的视频才会进入 AI 队列。</li>
    <li><strong>随时暂停：</strong>使用浮动暂停按钮可停止首页自动判断和待学习样本的自动分析，本地规则与缓存仍正常工作。</li>
    <li><strong>批量请求：</strong>一次最多判断 10 个视频，减少重复系统提示和网络请求开销。</li>
    <li><strong>缩短输入：</strong>只发送最近 3 个学习样本；标题最多 160 字、创作者名称最多 60 字，过滤描述和学习画像各最多 400 字；历史样本不再重复发送创作者名称。</li>
    <li><strong>压缩输出：</strong>不匹配项的原因要求返回空字符串，首次请求的输出 token 上限会按本批视频数量动态计算。</li>
    <li><strong>关闭不必要推理：</strong>对当前模型明确支持关闭思考的 OpenAI、豆包、千问、智谱和 Kimi 请求，脚本会默认关闭额外推理；腾讯混元的联网增强也保持关闭。用户改用不支持这些参数的旧模型时，脚本不会盲目附加对应设置。</li>
    <li><strong>异常时才扩容：</strong>首页分类、主动学习和候选规则生成共用同一补救流程；如果首次返回空内容、截断 JSON 或缺少必要字段，只提高输出额度重试一次。补救请求最低 1200、最高 2400 token，正常请求仍保持原来的低额度。</li>
    <li><strong>避免无效重试：</strong>JSON 格式错误在内部补救失败后不再进入外层同参数重复队列；网络错误、限流和服务端故障仍按原策略重试。</li>
    <li><strong>可见统计：</strong>面板状态会显示本页由本地规则和缓存省下的 AI 判断次数，以及实际发送给 AI 的视频数量。</li>
  </ul>

  <h2>黑名单与备份</h2>
  <ul>
    <li>B 站创作者使用 UID，YouTube 创作者使用带站点前缀的频道或 handle 标识，均保存在 Tampermonkey 本地存储中。</li>
    <li>创作者白名单使用同一标识保存，并优先于自动判断和普通黑名单。</li>
    <li>手动不喜欢样本使用规范化的视频 ID（BV、AV 或 <code>yt:</code>）作为唯一键，与创作者黑名单分开保存。</li>
    <li>可在设置面板中删除误判的黑名单、白名单和未采用的 AI 候选规则。</li>
    <li>“导出”会保存过滤描述、非敏感设置、创作者黑白名单、标题黑白名单、不喜欢样本和学习画像。</li>
    <li>导出文件不会包含 API Key 或 AI 判断缓存。</li>
    <li>“导入”会按创作者标识和视频 ID 合并数据，并保留当前设备的 API Key；v0.1.0 至 v0.5.0 的旧备份均可导入。</li>
  </ul>

  <h2>隐私说明</h2>
  <p>只有本地规则和缓存无法判断时，AI 判断才会把过滤描述、偏好画像、近期不喜欢样本的视频标题，以及待判断视频的标题和页面显示的创作者名称发送给所选 API 服务商。主动学习会发送当前手动不喜欢样本的标题和创作者名称。脚本不会主动发送 B 站或 YouTube Cookie、账号资料、频道标识或页面正文。API Key 仅存放在当前 Tampermonkey 脚本存储中，但浏览器本地存储不等同于系统级密码保险箱。</p>

  <h2>简要更新日志</h2>
  <h3>v0.7.0（2026-07-19）</h3>
  <ul>
    <li>修复 YouTube Trusted Types 安全策略导致脚本在创建界面时中断的问题。</li>
    <li>新增 YouTube 现代 <code>yt-lockup-view-model</code> 卡片识别，并让集成测试实际经过首页推荐区。</li>
    <li>只观察两站首页推荐区域，离开首页后断开观察并停止自动 AI 队列。</li>
    <li>AI 学习完成后不再重判整页；暂停和恢复也保留已经完成的判断，进一步节省 token。</li>
    <li>会话和持久缓存以稳定视频 ID 为主，在过滤条件不变时不因标题更新重复调用 AI。</li>
    <li>新增保守正则安全检查，拒绝可能造成灾难性回溯和网页卡死的规则。</li>
    <li>源码拆分为九个可组合片段，同时继续生成一个可直接安装的用户脚本。</li>
    <li>新增一键完整测试和 GitHub Actions，当前包含 31 项核心测试及 4 组浏览器集成测试。</li>
  </ul>
  <h3>v0.6.0（2026-07-19）</h3>
  <ul>
    <li>新增 YouTube 首页标准视频推荐支持，并保留 B 站现有行为。</li>
    <li>新增跨站卡片适配层、YouTube 单页导航监听和无限滚动扫描。</li>
    <li>YouTube 视频与频道使用带站点前缀的本地标识，避免与 B 站数据冲突。</li>
    <li>YouTube Shorts、广告和频道标识缺失卡片会保守跳过，不进入 AI 队列。</li>
    <li>右键不喜欢、主动学习、创作者黑白名单、暂停和缓存链路均可在 YouTube 首页使用。</li>
  </ul>
  <h3>v0.5.0（2026-07-15）</h3>
  <ul>
    <li>新增 OpenAI、Google Gemini、Anthropic Claude、豆包/火山方舟、阿里云百炼/千问、智谱 GLM、Kimi、腾讯混元和百度千帆。</li>
    <li>统一适配 Bearer、Claude <code>x-api-key</code>、<code>max_tokens</code>、<code>max_completion_tokens</code> 和不同响应格式。</li>
    <li>为适用模型默认关闭额外推理或联网增强，减少简单分类任务的 token 浪费。</li>
    <li>旧版设置与备份会自动补齐新增服务商，不会丢失原有 DeepSeek 或 AiHubMix 配置。</li>
  </ul>
  <h3>v0.4.2（2026-07-15）</h3>
  <ul>
    <li>修复部分首页视频卡片右键无法弹出屏蔽菜单的问题。</li>
    <li>新增 AV 链接、卡片 <code>data-bvid</code>/<code>data-aid</code> 属性和编码跳转链接识别。</li>
    <li>右键识别会沿完整事件路径查找卡片，兼容 Shadow DOM 和悬停预览覆盖层。</li>
  </ul>
  <h3>v0.4.1（2026-07-15）</h3>
  <ul>
    <li>暂停首页监视时，用户手动添加“不喜欢”仍会立即调用 AI 学习。</li>
    <li>手动学习完成后保持暂停，不会重新启动首页自动判断。</li>
    <li>历史积压样本仍会等恢复后再自动处理。</li>
  </ul>
  <h3>v0.4.0（2026-07-15）</h3>
  <ul>
    <li>浮动按钮新增暂停/恢复自动 AI 图标，并持久保存状态。</li>
    <li>暂停后不再发送新的首页分类或自动学习请求，本地规则和缓存继续生效。</li>
    <li>暂停前已发出的旧请求返回后会被忽略，避免旧判断改变页面。</li>
  </ul>
  <h3>v0.3.2（2026-07-15）</h3>
  <ul>
    <li>把 JSON 自适应补救扩展到主动学习和候选规则生成。</li>
    <li>兼容学习结果与候选规则中的常见安全字段别名。</li>
    <li>修复手动不喜欢样本已保存、但 AI 偏好画像无法更新的问题。</li>
    <li>作者署名由 <code>local</code> 更新为 <code>Felix8686</code>。</li>
  </ul>
  <h3>v0.3.1（2026-07-14）</h3>
  <ul>
    <li>修复模型返回空内容或 JSON 被输出额度截断时持续判断失败的问题。</li>
    <li>新增一次自适应高额度补救，并取消格式错误的同参数重复请求。</li>
    <li>状态提示会区分正常成功、自动修复成功，以及提高额度后仍失败。</li>
  </ul>
  <h3>v0.3.0（2026-07-14）</h3>
  <ul>
    <li>AI 命中改为只隐藏当前视频；同一 UP 主反复命中后提示用户确认是否拉黑。</li>
    <li>新增 UP 主白名单、标题关键词/正则黑白名单和右键手动拉黑 UP 主。</li>
    <li>新增需要用户确认的 AI 候选规则提炼功能。</li>
    <li>新增本地优先、判断缓存、输入裁剪、批量判断和动态输出额度等 token 节省机制。</li>
    <li>备份格式升级到 v3，并保持旧版本导入兼容。</li>
  </ul>
  <h3>v0.2.0（2026-07-14）</h3>
  <ul>
    <li>新增视频卡片右键“不喜欢”菜单、视频级隐藏与本地样本持久化。</li>
    <li>新增 AI 样本特征分析、偏好画像更新及后续推荐判断联动。</li>
    <li>设置面板改为紧凑折叠布局，减少对首页视频的遮挡。</li>
    <li>浮动按钮移至 B 站右侧工具栏左边，避免遮挡返回顶部按钮。</li>
    <li>备份格式升级并保持对 v0.1.0 备份的导入兼容。</li>
  </ul>
  <p>完整版本记录请查看 <a href="CHANGELOG.md">CHANGELOG.md</a>。</p>

  <h2>开发检查</h2>
  <p>在本目录运行以下命令：</p>
  <pre><code>node --check bilibili-ai-up-filter.user.js
node --test tests/core.test.js</code></pre>
  <p>浏览器集成回归位于 <code>tests/homepage-integration.html</code>、<code>tests/youtube-homepage-integration.html</code> 和 <code>tests/youtube-navigation-integration.html</code>；使用 Chrome 或 Edge 打开后，页面结果应显示 <strong>PASS</strong>。</p>

  <h2>项目文档</h2>
  <ul>
    <li><a href="CHANGELOG.md">版本记录</a></li>
    <li><a href="KNOWN_ISSUES.md">已知问题</a></li>
    <li><a href="GREASYFORK_DESCRIPTION.html">Greasy Fork 脚本介绍</a></li>
  </ul>
