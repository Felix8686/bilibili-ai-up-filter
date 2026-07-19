// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段

  function renderBlacklist() {
    const entries = Object.values(blacklist.entries)
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
    ui.blacklistCount.textContent = String(entries.length);
    ui.blacklistList.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "baf-empty";
      empty.textContent = "黑名单为空";
      ui.blacklistList.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "baf-entry";
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name || "未知创作者";
      const uid = document.createElement("small");
      uid.textContent = formatCreatorId(entry.uid);
      const source = document.createElement("small");
      source.textContent = entry.sourceTitle
        ? `命中：${entry.sourceTitle}`
        : entry.reason;
      info.append(name, uid, source);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "baf-delete";
      remove.textContent = "删除";
      remove.addEventListener("click", () => removeBlacklistEntry(entry.uid));
      row.append(info, remove);
      ui.blacklistList.appendChild(row);
    });
  }
  function renderWhitelist() {
    const entries = Object.values(rules.upWhitelist)
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
    ui.whitelistCount.textContent = String(entries.length);
    ui.whitelistList.replaceChildren();

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "baf-empty";
      empty.textContent = "白名单为空；可在视频卡片右键添加创作者";
      ui.whitelistList.appendChild(empty);
      return;
    }

    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "baf-entry";
      const info = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = entry.name;
      const uid = document.createElement("small");
      uid.textContent = formatCreatorId(entry.uid);
      info.append(name, uid);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "baf-delete";
      remove.textContent = "删除";
      remove.addEventListener("click", () => removeWhitelistEntry(entry.uid));
      row.append(info, remove);
      ui.whitelistList.appendChild(row);
    });
  }

  function renderRuleSuggestions() {
    ui.ruleSuggestions.replaceChildren();
    const groups = [
      ["blacklist", "黑名单", rules.pendingSuggestions.blacklist],
      ["whitelist", "白名单", rules.pendingSuggestions.whitelist],
    ];
    groups.forEach(([kind, label, suggestions]) => {
      suggestions.forEach((suggestion) => {
        const row = document.createElement("div");
        row.className = "baf-suggestion";
        const textNode = document.createElement("span");
        textNode.textContent = `${label}：${suggestion}`;
        const apply = document.createElement("button");
        apply.type = "button";
        apply.className = "baf-delete";
        apply.textContent = "采用";
        apply.addEventListener("click", () => applyRuleSuggestion(kind, suggestion));
        row.append(textNode, apply);
        ui.ruleSuggestions.appendChild(row);
      });
    });
  }

  function applyRuleSuggestion(kind, suggestion) {
    const target = kind === "whitelist" ? rules.titleWhitelist : rules.titleBlacklist;
    if (!target.some((item) => item.toLocaleLowerCase() === suggestion.toLocaleLowerCase())) {
      target.push(suggestion);
    }
    rules.pendingSuggestions[kind] = rules.pendingSuggestions[kind]
      .filter((item) => item !== suggestion);
    saveRules();
    resetSessionJudgments();
    syncPanel();
    setStatus(`已启用${kind === "whitelist" ? "白" : "黑"}名单规则“${suggestion}”`, "ok");
    scheduleScan(0);
  }

  function renderLearning() {
    const samples = Object.values(learning.samples)
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt));
    ui.learningCount.textContent = String(samples.length);
    ui.learningProfile.textContent = learning.learnedProfile
      ? `已学习偏好：${learning.learnedProfile}`
      : samples.length
        ? "样本已保存，等待 AI 生成偏好画像"
        : "尚未形成偏好画像";
    ui.learningList.replaceChildren();

    if (!samples.length) {
      const empty = document.createElement("div");
      empty.className = "baf-empty";
      empty.textContent = "在首页视频上点击右键即可添加不喜欢样本";
      ui.learningList.appendChild(empty);
      return;
    }

    samples.slice(0, 12).forEach((sample) => {
      const row = document.createElement("div");
      row.className = "baf-learning-item";
      const title = document.createElement("strong");
      title.textContent = sample.title;
      const status = document.createElement("small");
      status.textContent = sample.analyzedAt
        ? `已分析：${sample.analysis || sample.traits.join("、") || "已纳入偏好画像"}`
        : "等待 AI 分析";
      row.append(title, status);
      ui.learningList.appendChild(row);
    });
  }

  function removeBlacklistEntry(uid) {
    const entry = blacklist.entries[uid];
    if (!entry) return;
    if (!window.confirm(`从黑名单删除“${entry.name}”？`)) return;
    delete blacklist.entries[uid];
    sessionAllowedUids.add(uid);
    saveBlacklist();
    renderBlacklist();
    setStatus("已从黑名单删除；AI 命中不会自动重新拉黑创作者", "ok");
    scheduleScan(0);
  }

  function removeWhitelistEntry(uid) {
    const entry = rules.upWhitelist[uid];
    if (!entry) return;
    if (!window.confirm(`从白名单删除“${entry.name}”？`)) return;
    delete rules.upWhitelist[uid];
    saveRules();
    resetSessionJudgments();
    syncPanel();
    setStatus(`已从白名单删除“${entry.name}”`, "ok");
    scheduleScan(0);
  }

  function getUpSuggestions() {
    const criteriaKey = createCriteriaKey(settings, learning);
    const groups = new Map();
    Object.values(aiCache.entries).forEach((entry) => {
      if (!entry.uid
        || entry.criteriaKey !== criteriaKey
        || !isConfidentMatch(entry)
        || blacklist.entries[entry.uid]
        || rules.upWhitelist[entry.uid]
        || aiCache.ignoredUpSuggestions[entry.uid] === criteriaKey) return;
      const group = groups.get(entry.uid) || {
        uid: entry.uid,
        name: entry.upName,
        entries: [],
      };
      group.entries.push(entry);
      groups.set(entry.uid, group);
    });
    return [...groups.values()]
      .filter((group) => new Set(group.entries.map((entry) => entry.bvid)).size >= UP_SUGGESTION_THRESHOLD)
      .sort((left, right) => right.entries.length - left.entries.length)
      .slice(0, 3);
  }

  function renderUpSuggestions() {
    ui.upSuggestions.replaceChildren();
    getUpSuggestions().forEach((suggestion) => {
      const row = document.createElement("div");
      row.className = "baf-suggestion";
      const textNode = document.createElement("span");
      textNode.textContent = `AI 已命中 ${suggestion.entries.length} 个“${suggestion.name}”的视频，是否拉黑该创作者？`;
      const actions = document.createElement("div");
      actions.className = "baf-actions";
      const block = document.createElement("button");
      block.type = "button";
      block.textContent = "拉黑";
      block.addEventListener("click", () => blockSuggestedUp(suggestion));
      const ignore = document.createElement("button");
      ignore.type = "button";
      ignore.textContent = "忽略";
      ignore.addEventListener("click", () => ignoreSuggestedUp(suggestion.uid));
      actions.append(block, ignore);
      row.append(textNode, actions);
      ui.upSuggestions.appendChild(row);
    });
  }

  function blockSuggestedUp(suggestion) {
    const latest = suggestion.entries
      .sort((left, right) => right.judgedAt.localeCompare(left.judgedAt))[0];
    blacklist.entries[suggestion.uid] = {
      uid: suggestion.uid,
      name: suggestion.name,
      sourceTitle: latest?.title || "",
      reason: `AI 连续命中 ${suggestion.entries.length} 个视频后由用户确认`,
      addedAt: new Date().toISOString(),
      source: "manual",
    };
    saveBlacklist();
    resetSessionJudgments();
    syncPanel();
    setStatus(`已确认拉黑创作者“${suggestion.name}”`, "ok");
    scheduleScan(0);
  }

  function ignoreSuggestedUp(uid) {
    aiCache.ignoredUpSuggestions[uid] = createCriteriaKey(settings, learning);
    saveAiCache();
    renderUpSuggestions();
  }

  function exportBackup() {
    const backup = createBackup(settings, blacklist, new Date().toISOString(), learning, rules);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `homepage-ai-video-filter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("已导出设置和黑名单（不包含 API Key）", "ok");
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const imported = validateBackup(parsed);
      settings = imported.settings;

      imported.blacklist.forEach((entry) => {
        const existing = blacklist.entries[entry.uid];
        if (!existing || entry.addedAt >= existing.addedAt) {
          blacklist.entries[entry.uid] = entry;
        }
      });

      Object.values(imported.learning.samples).forEach((sample) => {
        const existing = learning.samples[sample.bvid];
        if (!existing || sample.addedAt >= existing.addedAt) {
          learning.samples[sample.bvid] = sample;
        }
      });
      if (imported.learning.updatedAt
        && imported.learning.updatedAt >= (learning.updatedAt || "")) {
        learning.learnedProfile = imported.learning.learnedProfile;
        learning.updatedAt = imported.learning.updatedAt;
      }

      rules.titleBlacklist = normalizeRuleList([
        ...rules.titleBlacklist,
        ...imported.rules.titleBlacklist,
      ]);
      rules.titleWhitelist = normalizeRuleList([
        ...rules.titleWhitelist,
        ...imported.rules.titleWhitelist,
      ]);
      Object.values(imported.rules.upWhitelist).forEach((entry) => {
        const existing = rules.upWhitelist[entry.uid];
        if (!existing || entry.addedAt >= existing.addedAt) {
          rules.upWhitelist[entry.uid] = entry;
        }
      });

      saveSettingsAndSecrets();
      saveBlacklist();
      saveLearning();
      saveRules();
      apiBlocked = false;
      consecutiveFailures = 0;
      retryNotBefore = 0;
      sessionLearningAttempts.clear();
      resetSessionJudgments();
      syncPanel();
      setStatus(
        `导入成功：${imported.blacklist.length} 个黑名单创作者、${Object.keys(imported.rules.upWhitelist).length} 个白名单创作者、${Object.keys(imported.learning.samples).length} 个不喜欢样本`,
        "ok"
      );
      scheduleScan(0);
      processPendingLearning();
    } catch (error) {
      setStatus(`导入失败：${error.message}`, "error");
    }
  }

  function validateBackup(value) {
    if (!value || typeof value !== "object") throw new Error("文件内容不是对象");
    if (![1, 2, SCHEMA_VERSION].includes(value.schemaVersion)) {
      throw new Error("不支持的备份版本");
    }
    if (!Array.isArray(value.blacklist)) throw new Error("黑名单格式不正确");

    const importedSettings = normalizeSettings(value.settings);
    const importedBlacklist = value.blacklist.map((entry) => {
      const clean = normalizeBlacklistEntry(entry);
      if (!clean) throw new Error("黑名单中存在无效创作者标识");
      return clean;
    });

    return {
      settings: importedSettings,
      blacklist: importedBlacklist,
      learning: normalizeLearning(value.learning),
      rules: normalizeRules(value.rules),
    };
  }

  function createBackup(
    settingsValue,
    blacklistValue,
    exportedAt = new Date().toISOString(),
    learningValue = DEFAULT_LEARNING,
    rulesValue = DEFAULT_RULES
  ) {
    return {
      schemaVersion: SCHEMA_VERSION,
      exportedAt,
      settings: normalizeSettings(settingsValue),
      blacklist: Object.values(normalizeBlacklist(blacklistValue).entries),
      learning: normalizeLearning(learningValue),
      rules: normalizeRules(rulesValue),
    };
  }
