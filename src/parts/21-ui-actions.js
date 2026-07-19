// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段
// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 允许频道标识未加载时手动隐藏当前 YouTube 视频

  function registerMenuCommand() {
    GM_registerMenuCommand("打开首页 AI 视频过滤设置", () => {
      ui.root.classList.add("baf-open");
      syncPanel();
    });
  }
  function registerVideoContextMenu() {
    document.addEventListener("contextmenu", (event) => {
      if (!isHomepage() || event.shiftKey) return;
      const candidate = getCandidateFromEvent(event);
      if (!candidate) return;

      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") {
        event.stopImmediatePropagation();
      }
      showVideoContextMenu(candidate, event.clientX, event.clientY);
    }, true);
    document.addEventListener("pointerdown", (event) => {
      if (!ui.contextMenu.classList.contains("baf-visible")) return;
      if (!ui.contextMenu.contains(event.target)) closeVideoContextMenu();
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeVideoContextMenu();
    });
    window.addEventListener("scroll", closeVideoContextMenu, true);
    window.addEventListener("blur", closeVideoContextMenu);
  }

  function getCandidateFromEvent(event) {
    if (event.target instanceof Element && ui.root.contains(event.target)) return null;
    const path = typeof event.composedPath === "function"
      ? event.composedPath()
      : [event.target];
    const targets = [
      ...path,
      ...(typeof document.elementsFromPoint === "function"
        ? document.elementsFromPoint(event.clientX, event.clientY)
        : []),
    ];
    const seen = new Set();

    for (const target of targets) {
      if (!(target instanceof Element) || seen.has(target) || ui.root.contains(target)) continue;
      seen.add(target);
      const candidate = getCandidateFromTarget(target);
      if (candidate) return candidate;
    }
    return null;
  }

  function getCandidateFromTarget(target) {
    const site = getActiveSiteConfig();
    if (!site) return null;
    // YouTube Polymer 卡片大量使用 Shadow DOM：普通 closest 无法越过 shadow 边界。
    let link = closestAcrossShadow(target, site.videoLinkSelector);
    let card = link ? findCard(link, site) : null;

    if (!card) {
      for (const selector of site.cardSelectors) {
        card = closestAcrossShadow(target, selector);
        if (card && card !== document.body && card !== document.documentElement) break;
        card = null;
      }
      link = card ? findVideoLink(card, site) : null;
    }

    if (!card && site.id === "youtube") {
      const videoId = extractVideoIdFromElement(target, site)
        || extractYouTubeVideoId(target.getAttribute?.("href") || "");
      if (videoId) {
        const hostCard = closestAcrossShadow(
          target,
          site.cardSelectors.join(", ")
        ) || target;
        return buildCandidate(hostCard, link || target, site, {
          allowMissingCreator: true,
          forcedVideoId: videoId,
        });
      }
    }

    return card ? buildCandidate(card, link, site, { allowMissingCreator: true }) : null;
  }

  function showVideoContextMenu(candidate, clientX, clientY) {
    contextCandidate = candidate;
    const alreadyAdded = Boolean(learning.samples[candidate.bvid]);
    ui.dislike.textContent = alreadyAdded
      ? "该视频已在不喜欢样本中"
      : "不喜欢此视频 · 隐藏并让 AI 学习";
    ui.dislike.disabled = alreadyAdded;
    const isBlacklisted = Boolean(candidate.uid && blacklist.entries[candidate.uid]);
    const isWhitelisted = Boolean(candidate.uid && rules.upWhitelist[candidate.uid]);
    ui.blockUp.textContent = isBlacklisted ? "该创作者已在黑名单" : `拉黑创作者：${candidate.upName}`;
    ui.blockUp.disabled = !candidate.uid || isBlacklisted;
    ui.allowUp.textContent = isWhitelisted ? "该创作者已在白名单" : `始终显示创作者：${candidate.upName}`;
    ui.allowUp.disabled = !candidate.uid || isWhitelisted;
    ui.contextMenu.classList.add("baf-visible");
    const rect = ui.contextMenu.getBoundingClientRect();
    const left = Math.max(8, Math.min(clientX, window.innerWidth - rect.width - 8));
    const top = Math.max(8, Math.min(clientY, window.innerHeight - rect.height - 8));
    ui.contextMenu.style.left = `${left}px`;
    ui.contextMenu.style.top = `${top}px`;
  }

  function closeVideoContextMenu() {
    ui.contextMenu?.classList.remove("baf-visible");
    contextCandidate = null;
  }

  function handleManualDislike() {
    const candidate = contextCandidate;
    closeVideoContextMenu();
    if (!candidate || learning.samples[candidate.bvid]) return;

    const now = new Date().toISOString();
    learning.samples[candidate.bvid] = {
      bvid: candidate.bvid,
      title: candidate.title,
      uid: candidate.uid,
      upName: candidate.upName,
      addedAt: now,
      analysis: "",
      traits: [],
      analyzedAt: "",
    };
    saveLearning();
    sessionLearningAttempts.delete(candidate.bvid);
    sessionJudgments.delete(candidate.fingerprint);
    pendingCandidates.delete(candidate.fingerprint);
    setCardHidden(candidate.card, true);
    renderLearning();
    setStatus(
      secrets.keys[settings.provider]
        ? settings.monitoringPaused
          ? `已隐藏“${candidate.title}”；AI 正在学习此手动样本，首页自动监视仍暂停`
          : `已隐藏“${candidate.title}”，AI 正在学习其特征……`
        : settings.monitoringPaused
          ? `已隐藏“${candidate.title}”并保存样本；填写 API Key 并恢复自动 AI 后再学习`
          : `已隐藏“${candidate.title}”并保存样本；填写 API Key 后会自动学习`,
      "ok"
    );
    processPendingLearning({
      allowWhilePaused: true,
      targetBvid: candidate.bvid,
    });
  }

  function handleManualBlockUp() {
    const candidate = contextCandidate;
    closeVideoContextMenu();
    if (!candidate?.uid) return;
    blacklist.entries[candidate.uid] = {
      uid: candidate.uid,
      name: candidate.upName,
      sourceTitle: candidate.title,
      reason: "用户通过右键菜单手动拉黑",
      addedAt: new Date().toISOString(),
      source: "manual",
    };
    delete rules.upWhitelist[candidate.uid];
    delete aiCache.ignoredUpSuggestions[candidate.uid];
    saveBlacklist();
    saveRules();
    saveAiCache();
    resetSessionJudgments();
    syncPanel();
    setStatus(`已手动拉黑创作者“${candidate.upName}”`, "ok");
    scheduleScan(0);
  }

  function handleManualAllowUp() {
    const candidate = contextCandidate;
    closeVideoContextMenu();
    if (!candidate?.uid) return;
    rules.upWhitelist[candidate.uid] = {
      uid: candidate.uid,
      name: candidate.upName,
      addedAt: new Date().toISOString(),
    };
    delete blacklist.entries[candidate.uid];
    delete aiCache.ignoredUpSuggestions[candidate.uid];
    saveRules();
    saveBlacklist();
    saveAiCache();
    resetSessionJudgments();
    syncPanel();
    setStatus(`已将创作者“${candidate.upName}”加入白名单`, "ok");
    scheduleScan(0);
  }

  function syncPanel() {
    panelProvider = settings.provider;
    ui.enabled.checked = settings.enabled;
    ui.description.value = settings.description;
    ui.provider.value = panelProvider;
    ui.model.value = settings.models[panelProvider];
    ui.apiKey.value = secrets.keys[panelProvider];
    ui.providerNote.textContent = PROVIDERS[panelProvider].hint;
    ui.titleBlacklist.value = rules.titleBlacklist.join("\n");
    ui.titleWhitelist.value = rules.titleWhitelist.join("\n");
    renderBlacklist();
    renderWhitelist();
    renderLearning();
    renderRuleSuggestions();
    renderUpSuggestions();
    updateToggle();
  }

  function handleProviderChange() {
    settings.models[panelProvider] = normalizeModel(
      ui.model.value,
      PROVIDERS[panelProvider].defaultModel
    );
    secrets.keys[panelProvider] = normalizeSecret(ui.apiKey.value);
    panelProvider = ui.provider.value;
    ui.model.value = settings.models[panelProvider];
    ui.apiKey.value = secrets.keys[panelProvider];
    ui.providerNote.textContent = PROVIDERS[panelProvider].hint;
  }

  function readPanelValues() {
    const provider = ui.provider.value;
    const invalidRegexRules = [
      ...findInvalidRegexRules(ui.titleBlacklist.value),
      ...findInvalidRegexRules(ui.titleWhitelist.value),
    ];
    return {
      enabled: ui.enabled.checked,
      description: ui.description.value.trim().slice(0, 500),
      provider,
      model: normalizeModel(ui.model.value, PROVIDERS[provider].defaultModel),
      apiKey: normalizeSecret(ui.apiKey.value),
      titleBlacklist: normalizeRuleList(ui.titleBlacklist.value.split(/\r?\n/)),
      titleWhitelist: normalizeRuleList(ui.titleWhitelist.value.split(/\r?\n/)),
      invalidRegexRules,
    };
  }

  function handleSave() {
    const values = readPanelValues();
    if (values.invalidRegexRules.length) {
      const invalid = values.invalidRegexRules[0];
      setStatus(`规则“${invalid.rule}”未保存：${invalid.reason}`, "error");
      return;
    }
    settings.enabled = values.enabled;
    settings.description = values.description;
    settings.provider = values.provider;
    settings.models[values.provider] = values.model;
    secrets.keys[values.provider] = values.apiKey;
    rules.titleBlacklist = values.titleBlacklist;
    rules.titleWhitelist = values.titleWhitelist;
    panelProvider = values.provider;
    apiBlocked = false;
    consecutiveFailures = 0;
    retryNotBefore = 0;
    sessionLearningAttempts.clear();

    resetSessionJudgments();
    saveSettingsAndSecrets();
    saveRules();
    setStatus("设置已保存", "ok");
    syncPanel();
    scheduleScan(0);
    processPendingLearning();
  }

  function handleMonitoringToggle(event) {
    event?.stopPropagation();
    settings.monitoringPaused = !settings.monitoringPaused;
    monitoringGeneration += 1;
    retryNotBefore = 0;
    sessionLearningAttempts.clear();
    cancelPendingEvaluations();
    saveSettings();
    updateToggle();

    if (settings.monitoringPaused) {
      setStatus("自动 AI 监视已暂停；本地规则与已有缓存继续生效", "ok");
    } else {
      setStatus("自动 AI 监视已恢复", "ok");
      processPendingLearning();
    }
    scheduleScan(0);
  }

  async function handleConnectionTest() {
    const values = readPanelValues();
    if (!values.apiKey) {
      setStatus("请先填写 API Key", "error");
      return;
    }

    ui.test.disabled = true;
    setStatus("正在测试 API 连接……", "");
    try {
      const testCandidate = {
        fingerprint: "connection-test",
        title: "普通的视频标题",
        upName: "连接测试",
      };
      const evaluation = await evaluateCandidates([testCandidate], {
        provider: values.provider,
        model: values.model,
        apiKey: values.apiKey,
        description: "这是一次连接测试，请将该条目标记为不匹配。",
        learningProfile: "",
        learningSamples: [],
      });
      apiBlocked = false;
      setStatus(
        evaluation.recovered
          ? "API 连接正常；首次 JSON 输出异常，已自动提高额度修复"
          : "API 连接与返回格式正常",
        "ok"
      );
    } catch (error) {
      setStatus(formatApiError(error), "error");
    } finally {
      ui.test.disabled = false;
    }
  }

  async function handleSuggestRules() {
    if (ruleSuggestionInFlight) return;
    const values = readPanelValues();
    if (!values.apiKey) {
      setStatus("请先填写 API Key", "error");
      return;
    }
    if (!values.description && !learning.learnedProfile) {
      setStatus("请先填写过滤描述或积累不喜欢样本", "error");
      return;
    }

    ruleSuggestionInFlight = true;
    ui.suggestRules.disabled = true;
    setStatus("AI 正在提炼少量高精度候选规则……", "");
    try {
      const result = await suggestLocalRules({
        provider: values.provider,
        model: values.model,
        apiKey: values.apiKey,
        description: values.description,
      });
      rules.pendingSuggestions.blacklist = result.blacklist
        .filter((item) => !rules.titleBlacklist.includes(item));
      rules.pendingSuggestions.whitelist = result.whitelist
        .filter((item) => !rules.titleWhitelist.includes(item));
      saveRules();
      renderRuleSuggestions();
      setStatus(
        result.recovered
          ? "候选规则已生成；首次 JSON 异常已自动修复，点击“采用”后才会生效"
          : "候选规则已生成；只有点击“采用”后才会生效",
        "ok"
      );
    } catch (error) {
      setStatus(formatApiError(error, "候选规则生成"), "error");
    } finally {
      ruleSuggestionInFlight = false;
      ui.suggestRules.disabled = false;
    }
  }

  async function suggestLocalRules(config) {
    const provider = PROVIDERS[config.provider];
    if (!provider) throw new Error("不支持的 API 服务商");
    const systemPrompt = [
      "从用户的视频过滤偏好中提炼少量高精度标题规则。",
      "黑名单只选明确、不易误伤的关键词或简短正则；白名单只提取明确的例外。",
      "不要生成宽泛词，不要自动启用规则。",
      '只返回 JSON：{"blacklist":["词或/正则/"],"whitelist":["词或/正则/"]}。',
      "黑名单最多 8 条，白名单最多 4 条。",
    ].join("\n");
    const userPrompt = JSON.stringify({
      description: String(config.description || "").slice(0, 400),
      learnedProfile: learning.learnedProfile.slice(0, 400),
      recentDislikes: getLearningPromptSamples(MAX_PROMPT_SAMPLES)
        .map((sample) => sample.title),
    });
    const baseBody = {
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 320,
    };
    const structured = await requestStructuredJson(
      provider,
      config.apiKey,
      baseBody,
      parseRuleSuggestions,
      getStructuredRecoveryTokenBudget(baseBody.max_tokens * 3)
    );
    return {
      ...structured.value,
      recovered: structured.recovered,
    };
  }

  function parseRuleSuggestions(content) {
    if (typeof content !== "string") {
      const error = new Error("模型没有返回候选规则");
      error.parseFailure = true;
      throw error;
    }
    const cleaned = content
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    let parsed;
    try {
      parsed = start >= 0 && end > start
        ? JSON.parse(cleaned.slice(start, end + 1))
        : null;
    } catch {
      parsed = null;
    }
    const blacklist = parsed?.blacklist
      ?? parsed?.titleBlacklist
      ?? parsed?.blacklistRules;
    const whitelist = parsed?.whitelist
      ?? parsed?.titleWhitelist
      ?? parsed?.whitelistRules;
    if (!parsed || !Array.isArray(blacklist) || !Array.isArray(whitelist)) {
      const error = new Error("模型返回的候选规则格式不正确");
      error.parseFailure = true;
      throw error;
    }
    return {
      blacklist: normalizeRuleList(blacklist).slice(0, 8),
      whitelist: normalizeRuleList(whitelist).slice(0, 4),
    };
  }
