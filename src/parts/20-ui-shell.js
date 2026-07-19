// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段

  function addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .baf-hidden { display: none !important; }
      #baf-root {
        position: fixed;
        right: 76px;
        bottom: 20px;
        z-index: 2147483647;
        color: #222;
        font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #baf-controls { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
      #baf-toggle, #baf-monitor-toggle {
        min-width: 94px;
        height: 32px;
        padding: 0 10px;
        border: 1px solid #aaa;
        border-radius: 6px;
        background: #fff;
        color: #222;
        cursor: pointer;
      }
      #baf-monitor-toggle {
        min-width: 32px;
        width: 32px;
        padding: 0;
        font-size: 15px;
      }
      #baf-root.baf-monitor-paused #baf-toggle,
      #baf-root.baf-monitor-paused #baf-monitor-toggle {
        border-color: #d49b22;
        background: #fff8df;
      }
      #baf-panel {
        display: none;
        position: absolute;
        right: 0;
        bottom: 40px;
        box-sizing: border-box;
        width: min(360px, calc(100vw - 24px));
        max-height: min(560px, calc(100vh - 104px));
        overflow: auto;
        padding: 12px;
        border: 1px solid #aaa;
        border-radius: 6px;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .24);
      }
      #baf-root.baf-open #baf-panel { display: block; }
      #baf-panel h2 { margin: 0 0 8px; font-size: 15px; }
      #baf-panel label { display: block; margin: 7px 0 3px; }
      #baf-panel input[type="text"],
      #baf-panel input[type="password"],
      #baf-panel select,
      #baf-panel textarea {
        box-sizing: border-box;
        width: 100%;
        border: 1px solid #aaa;
        border-radius: 4px;
        background: #fff;
        color: #222;
        padding: 6px;
      }
      #baf-panel textarea { min-height: 58px; resize: vertical; }
      .baf-inline { display: flex; align-items: center; gap: 7px; }
      .baf-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
      .baf-actions button, .baf-delete {
        min-height: 28px;
        border: 1px solid #999;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
      }
      .baf-actions button { padding: 0 9px; }
      #baf-save { background: #00aeec; border-color: #00aeec; color: #fff; }
      #baf-status, #baf-summary {
        margin-top: 8px;
        padding: 6px;
        border-radius: 4px;
        background: #f3f4f6;
        word-break: break-word;
      }
      #baf-status[data-kind="error"] { background: #fee2e2; color: #991b1b; }
      #baf-status[data-kind="ok"] { background: #dcfce7; color: #166534; }
      .baf-section {
        margin-top: 8px;
        border: 1px solid #ddd;
        border-radius: 5px;
        background: #fafafa;
      }
      .baf-section > summary {
        padding: 7px 8px;
        cursor: pointer;
        font-weight: 600;
        user-select: none;
      }
      .baf-section-body { padding: 0 8px 8px; }
      #baf-blacklist, #baf-whitelist, #baf-learning-list, #baf-rule-suggestions {
        display: grid;
        max-height: 170px;
        overflow: auto;
        gap: 6px;
      }
      .baf-entry {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: start;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
      }
      .baf-entry small { display: block; color: #666; word-break: break-word; }
      .baf-delete { padding: 3px 8px; }
      .baf-empty { color: #666; }
      #baf-learning-profile {
        margin-bottom: 7px;
        padding: 6px;
        border-radius: 4px;
        background: #eef6ff;
        color: #334155;
        word-break: break-word;
      }
      .baf-learning-item {
        padding: 6px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #fff;
      }
      .baf-learning-item small { display: block; color: #666; }
      .baf-rule-note { margin-top: 5px; color: #666; }
      .baf-suggestion {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        padding: 6px;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: #fff;
      }
      #baf-up-suggestions:empty, #baf-rule-suggestions:empty { display: none; }
      #baf-up-suggestions {
        margin-top: 8px;
        padding: 7px;
        border: 1px solid #f59e0b;
        border-radius: 5px;
        background: #fffbeb;
      }
      #baf-context-menu {
        display: none;
        position: fixed;
        left: 0;
        top: 0;
        width: 246px;
        box-sizing: border-box;
        padding: 6px;
        border: 1px solid #bbb;
        border-radius: 7px;
        background: #fff;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .2);
      }
      #baf-context-menu.baf-visible { display: block; }
      #baf-context-menu button {
        width: 100%;
        padding: 8px;
        border: 0;
        border-radius: 5px;
        background: #fff;
        color: #222;
        text-align: left;
        cursor: pointer;
      }
      #baf-context-menu button:hover { background: #eaf7ff; }
      #baf-context-menu button:disabled { color: #888; cursor: default; }
      #baf-context-menu button:disabled:hover { background: #fff; }
      #baf-context-menu small { display: block; padding: 4px 8px 2px; color: #777; }
      @media (max-width: 640px) {
        #baf-root { right: 12px; bottom: 64px; }
        #baf-panel { max-height: calc(100vh - 116px); }
      }
    `;
    document.documentElement.appendChild(style);
  }
  function createUi() {
    const root = document.createElement("div");
    root.id = "baf-root";
    const panel = createUiElement("div", {
      id: "baf-panel",
      "aria-label": "首页 AI 视频过滤设置",
    });
    panel.append(
      createUiElement("h2", { text: "首页 AI 视频过滤" }),
      createUiElement("label", { className: "baf-inline" }, [
        createUiElement("input", { id: "baf-enabled", type: "checkbox" }),
        createUiElement("span", { text: "启用首页过滤" }),
      ]),
      createUiElement("label", { htmlFor: "baf-description", text: "要过滤的内容描述" }),
      createUiElement("textarea", {
        id: "baf-description",
        maxLength: 500,
        placeholder: "例如：擦边、夸张猎奇、标题党的内容",
      }),
      createUiElement("div", { className: "baf-actions" }, [
        createUiElement("button", { id: "baf-save", type: "button", text: "保存" }),
        createUiElement("button", { id: "baf-close", type: "button", text: "关闭" }),
      ])
    );

    const providerSelect = createUiElement("select", { id: "baf-provider" });
    Object.entries(PROVIDERS).forEach(([providerId, provider]) => {
      providerSelect.appendChild(createUiElement("option", {
        value: providerId,
        text: provider.label,
      }));
    });
    panel.appendChild(createUiSection("API 与备份", [
      createUiElement("label", { htmlFor: "baf-provider", text: "API 服务商" }),
      providerSelect,
      createUiElement("label", { htmlFor: "baf-model", text: "模型" }),
      createUiElement("input", { id: "baf-model", type: "text", maxLength: 120 }),
      createUiElement("label", { htmlFor: "baf-api-key", text: "API Key" }),
      createUiElement("input", {
        id: "baf-api-key",
        type: "password",
        maxLength: 500,
        autocomplete: "new-password",
        placeholder: "只保存在 Tampermonkey 本地",
      }),
      createUiElement("div", { id: "baf-provider-note", className: "baf-rule-note" }),
      createUiElement("div", { className: "baf-actions" }, [
        createUiElement("button", { id: "baf-test", type: "button", text: "测试连接" }),
        createUiElement("button", { id: "baf-export", type: "button", text: "导出" }),
        createUiElement("button", { id: "baf-import", type: "button", text: "导入" }),
      ]),
      createUiElement("input", {
        id: "baf-import-file",
        type: "file",
        accept: "application/json,.json",
        hidden: true,
      }),
    ]));

    panel.append(
      createUiElement("div", {
        id: "baf-status",
        "aria-live": "polite",
        text: "尚未开始判断",
      }),
      createUiElement("div", { id: "baf-summary", text: "首页扫描等待中" }),
      createUiElement("div", { id: "baf-up-suggestions" })
    );
    panel.appendChild(createUiSection("本地标题规则", [
      createUiElement("label", {
        htmlFor: "baf-title-blacklist",
        text: "黑名单规则（每行一个关键词或 /正则/）",
      }),
      createUiElement("textarea", {
        id: "baf-title-blacklist",
        rows: 3,
        placeholder: "例如：卖课\n/月入|日赚/",
        maxLength: 12000,
      }),
      createUiElement("label", {
        htmlFor: "baf-title-whitelist",
        text: "白名单规则（优先显示）",
      }),
      createUiElement("textarea", {
        id: "baf-title-whitelist",
        rows: 2,
        placeholder: "例如：官方纪录片",
        maxLength: 12000,
      }),
      createUiElement("div", { className: "baf-actions" }, [
        createUiElement("button", {
          id: "baf-suggest-rules",
          type: "button",
          text: "AI 提炼候选规则",
        }),
      ]),
      createUiElement("div", {
        className: "baf-rule-note",
        text: "候选规则不会自动启用，需要手动确认。",
      }),
      createUiElement("div", { id: "baf-rule-suggestions" }),
    ]));
    panel.append(
      createUiCountSection("创作者黑名单（", "baf-blacklist-count", "）", [
        createUiElement("div", { id: "baf-blacklist" }),
      ]),
      createUiCountSection("创作者白名单（", "baf-whitelist-count", "）", [
        createUiElement("div", { id: "baf-whitelist" }),
      ]),
      createUiCountSection("AI 主动学习（", "baf-learning-count", " 个样本）", [
        createUiElement("div", { id: "baf-learning-profile", text: "尚未形成偏好画像" }),
        createUiElement("div", { id: "baf-learning-list" }),
      ])
    );

    const controls = createUiElement("div", { id: "baf-controls" }, [
      createUiElement("button", { id: "baf-toggle", type: "button", text: "AI 过滤" }),
      createUiElement("button", {
        id: "baf-monitor-toggle",
        type: "button",
        "aria-label": "暂停自动 AI 监视",
        title: "暂停自动 AI 监视；本地规则与缓存继续生效",
        text: "⏸",
      }),
    ]);
    const contextMenu = createUiElement("div", {
      id: "baf-context-menu",
      role: "menu",
      "aria-label": "视频过滤菜单",
    }, [
      createUiElement("button", {
        id: "baf-dislike",
        type: "button",
        role: "menuitem",
        text: "不喜欢此视频 · 隐藏并让 AI 学习",
      }),
      createUiElement("button", {
        id: "baf-block-up",
        type: "button",
        role: "menuitem",
        text: "拉黑该创作者",
      }),
      createUiElement("button", {
        id: "baf-allow-up",
        type: "button",
        role: "menuitem",
        text: "始终显示该创作者",
      }),
      createUiElement("small", { text: "按 Shift + 右键可使用浏览器原菜单" }),
    ]);
    root.append(panel, controls, contextMenu);
    document.documentElement.appendChild(root);

    const elements = {
      root,
      panel: root.querySelector("#baf-panel"),
      toggle: root.querySelector("#baf-toggle"),
      monitorToggle: root.querySelector("#baf-monitor-toggle"),
      enabled: root.querySelector("#baf-enabled"),
      description: root.querySelector("#baf-description"),
      provider: root.querySelector("#baf-provider"),
      model: root.querySelector("#baf-model"),
      apiKey: root.querySelector("#baf-api-key"),
      providerNote: root.querySelector("#baf-provider-note"),
      save: root.querySelector("#baf-save"),
      test: root.querySelector("#baf-test"),
      exportButton: root.querySelector("#baf-export"),
      importButton: root.querySelector("#baf-import"),
      importFile: root.querySelector("#baf-import-file"),
      close: root.querySelector("#baf-close"),
      status: root.querySelector("#baf-status"),
      summary: root.querySelector("#baf-summary"),
      upSuggestions: root.querySelector("#baf-up-suggestions"),
      titleBlacklist: root.querySelector("#baf-title-blacklist"),
      titleWhitelist: root.querySelector("#baf-title-whitelist"),
      suggestRules: root.querySelector("#baf-suggest-rules"),
      ruleSuggestions: root.querySelector("#baf-rule-suggestions"),
      blacklistCount: root.querySelector("#baf-blacklist-count"),
      blacklistList: root.querySelector("#baf-blacklist"),
      whitelistCount: root.querySelector("#baf-whitelist-count"),
      whitelistList: root.querySelector("#baf-whitelist"),
      learningCount: root.querySelector("#baf-learning-count"),
      learningProfile: root.querySelector("#baf-learning-profile"),
      learningList: root.querySelector("#baf-learning-list"),
      contextMenu: root.querySelector("#baf-context-menu"),
      dislike: root.querySelector("#baf-dislike"),
      blockUp: root.querySelector("#baf-block-up"),
      allowUp: root.querySelector("#baf-allow-up"),
    };

    elements.toggle.addEventListener("click", () => {
      root.classList.toggle("baf-open");
      if (root.classList.contains("baf-open")) syncPanel();
    });
    elements.monitorToggle.addEventListener("click", handleMonitoringToggle);
    elements.close.addEventListener("click", () => root.classList.remove("baf-open"));
    elements.provider.addEventListener("change", handleProviderChange);
    elements.save.addEventListener("click", handleSave);
    elements.test.addEventListener("click", handleConnectionTest);
    elements.exportButton.addEventListener("click", exportBackup);
    elements.importButton.addEventListener("click", () => elements.importFile.click());
    elements.importFile.addEventListener("change", importBackup);
    elements.dislike.addEventListener("click", handleManualDislike);
    elements.blockUp.addEventListener("click", handleManualBlockUp);
    elements.allowUp.addEventListener("click", handleManualAllowUp);
    elements.suggestRules.addEventListener("click", handleSuggestRules);

    return elements;
  }

  function createUiElement(tagName, attributes = {}, children = []) {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "text") {
        element.textContent = String(value);
      } else if (key === "className") {
        element.className = String(value);
      } else if (key === "htmlFor") {
        element.htmlFor = String(value);
      } else if (key.startsWith("aria-") || key === "role") {
        element.setAttribute(key, String(value));
      } else if (key in element) {
        element[key] = value;
      } else {
        element.setAttribute(key, String(value));
      }
    });
    children.forEach((child) => element.appendChild(child));
    return element;
  }

  function createUiSection(summaryText, children) {
    const details = createUiElement("details", { className: "baf-section" });
    details.append(
      createUiElement("summary", { text: summaryText }),
      createUiElement("div", { className: "baf-section-body" }, children)
    );
    return details;
  }

  function createUiCountSection(prefix, countId, suffix, children) {
    const details = createUiElement("details", { className: "baf-section" });
    const summary = createUiElement("summary");
    summary.append(
      document.createTextNode(prefix),
      createUiElement("span", { id: countId, text: "0" }),
      document.createTextNode(suffix)
    );
    details.append(summary, createUiElement("div", { className: "baf-section-body" }, children));
    return details;
  }
