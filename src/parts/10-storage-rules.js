// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段
// AI-Model-Signature: grok-4.5 | 2026-07-19 | 默认暂停自动 AI 监视；保留用户已保存的开启状态

  function readStoredObject(key, fallback) {
    try {
      const value = GM_getValue(key, null);
      if (value === null || value === undefined || value === "") {
        return clone(fallback);
      }
      return typeof value === "string" ? JSON.parse(value) : value;
    } catch (error) {
      console.warn(`[BAF] 无法读取 ${key}`, error);
      return clone(fallback);
    }
  }

  function writeStoredObject(key, value) {
    GM_setValue(key, JSON.stringify(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createProviderDefaults(field) {
    return Object.fromEntries(Object.entries(PROVIDERS).map(([providerId, provider]) => [
      providerId,
      field === "" ? "" : provider[field],
    ]));
  }

  function getProviderCatalog() {
    return Object.fromEntries(Object.entries(PROVIDERS).map(([providerId, provider]) => [
      providerId,
      {
        id: provider.id,
        label: provider.label,
        endpoint: provider.endpoint,
        defaultModel: provider.defaultModel,
        apiStyle: provider.apiStyle,
        tokenField: provider.tokenField,
        supportsJsonMode: provider.supportsJsonMode,
      },
    ]));
  }

  function normalizeSettings(value) {
    const source = value && typeof value === "object" ? value : {};
    const provider = Object.hasOwn(PROVIDERS, source.provider)
      ? source.provider
      : DEFAULT_SETTINGS.provider;
    const sourceModels = source.models && typeof source.models === "object"
      ? source.models
      : {};

    const models = {};
    Object.entries(PROVIDERS).forEach(([providerId, providerConfig]) => {
      models[providerId] = normalizeModel(
        sourceModels[providerId],
        providerConfig.defaultModel
      );
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      enabled: source.enabled !== false,
      // 显式保存过的值优先；全新安装或缺省字段时默认暂停自动 AI。
      monitoringPaused: Object.hasOwn(source, "monitoringPaused")
        ? source.monitoringPaused === true
        : DEFAULT_SETTINGS.monitoringPaused === true,
      description: typeof source.description === "string"
        ? source.description.trim().slice(0, 500)
        : "",
      provider,
      models,
    };
  }

  function normalizeSecrets(value) {
    const source = value && typeof value === "object" ? value : {};
    const keys = source.keys && typeof source.keys === "object" ? source.keys : {};
    const normalizedKeys = {};
    Object.keys(PROVIDERS).forEach((providerId) => {
      normalizedKeys[providerId] = normalizeSecret(keys[providerId]);
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      keys: normalizedKeys,
    };
  }

  function normalizeBlacklist(value) {
    const source = value && typeof value === "object" ? value : {};
    const entries = source.entries && typeof source.entries === "object"
      ? source.entries
      : {};
    const normalized = {};

    Object.values(entries).forEach((entry) => {
      const clean = normalizeBlacklistEntry(entry);
      if (clean) normalized[clean.uid] = clean;
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      entries: normalized,
    };
  }

  function normalizeBlacklistEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const uid = String(entry.uid || "").trim();
    if (!isSupportedCreatorId(uid)) return null;
    return {
      uid,
      name: normalizeText(String(entry.name || "未知创作者")).slice(0, 80),
      sourceTitle: normalizeText(String(entry.sourceTitle || "")).slice(0, 180),
      reason: normalizeText(String(entry.reason || "AI 语义判断命中")).slice(0, 160),
      addedAt: isValidDateString(entry.addedAt)
        ? entry.addedAt
        : new Date().toISOString(),
      source: entry.source === "manual" ? "manual" : "ai",
    };
  }

  function normalizeLearning(value) {
    const source = value && typeof value === "object" ? value : {};
    const sourceSamples = source.samples && typeof source.samples === "object"
      ? source.samples
      : {};
    const normalizedSamples = Object.values(sourceSamples)
      .map(normalizeLearningSample)
      .filter(Boolean)
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt))
      .slice(0, MAX_LEARNING_SAMPLES);
    const samples = {};
    normalizedSamples.forEach((sample) => {
      samples[sample.bvid] = sample;
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      samples,
      learnedProfile: normalizeText(String(source.learnedProfile || "")).slice(0, 600),
      updatedAt: isValidDateString(source.updatedAt) ? source.updatedAt : "",
    };
  }

  function normalizeLearningSample(entry) {
    if (!entry || typeof entry !== "object") return null;
    const bvid = extractVideoId(entry.bvid);
    if (!isSupportedVideoId(bvid)) return null;
    const uid = String(entry.uid || "").trim();
    const traits = Array.isArray(entry.traits)
      ? entry.traits
        .map((trait) => normalizeText(String(trait)).slice(0, 50))
        .filter(Boolean)
        .slice(0, 8)
      : [];
    return {
      bvid,
      title: normalizeText(String(entry.title || "未知视频")).slice(0, 180),
      uid: isSupportedCreatorId(uid) ? uid : "",
      upName: normalizeText(String(entry.upName || "未知创作者")).slice(0, 80),
      addedAt: isValidDateString(entry.addedAt)
        ? entry.addedAt
        : new Date().toISOString(),
      analysis: normalizeText(String(entry.analysis || "")).slice(0, 240),
      traits,
      analyzedAt: isValidDateString(entry.analyzedAt) ? entry.analyzedAt : "",
    };
  }

  function normalizeRules(value) {
    const source = value && typeof value === "object" ? value : {};
    const sourceWhitelist = source.upWhitelist && typeof source.upWhitelist === "object"
      ? source.upWhitelist
      : {};
    const upWhitelist = {};
    Object.values(sourceWhitelist).forEach((entry) => {
      const clean = normalizeWhitelistEntry(entry);
      if (clean) upWhitelist[clean.uid] = clean;
    });
    const suggestions = source.pendingSuggestions && typeof source.pendingSuggestions === "object"
      ? source.pendingSuggestions
      : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      titleBlacklist: normalizeRuleList(source.titleBlacklist),
      titleWhitelist: normalizeRuleList(source.titleWhitelist),
      upWhitelist,
      pendingSuggestions: {
        blacklist: normalizeRuleList(suggestions.blacklist).slice(0, 12),
        whitelist: normalizeRuleList(suggestions.whitelist).slice(0, 12),
      },
    };
  }

  function normalizeWhitelistEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const uid = String(entry.uid || "").trim();
    if (!isSupportedCreatorId(uid)) return null;
    return {
      uid,
      name: normalizeText(String(entry.name || "未知创作者")).slice(0, 80),
      addedAt: isValidDateString(entry.addedAt)
        ? entry.addedAt
        : new Date().toISOString(),
    };
  }

  function normalizeRuleList(value) {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    const result = [];
    value.forEach((item) => {
      const rule = normalizeText(String(item || "")).slice(0, 120);
      const key = rule.toLocaleLowerCase();
      if (!rule || seen.has(key) || result.length >= MAX_RULES_PER_LIST) return;
      if (rule.startsWith("/") && !validateRegexRule(rule).valid) return;
      seen.add(key);
      result.push(rule);
    });
    return result;
  }

  function normalizeAiCache(value) {
    const source = value && typeof value === "object" ? value : {};
    const sourceEntries = source.entries && typeof source.entries === "object"
      ? source.entries
      : {};
    const entries = {};
    Object.values(sourceEntries)
      .map(normalizeAiCacheEntry)
      .filter(Boolean)
      .sort((left, right) => right.judgedAt.localeCompare(left.judgedAt))
      .slice(0, MAX_DECISION_CACHE)
      .forEach((entry) => {
        entries[entry.bvid] = entry;
      });
    const ignored = source.ignoredUpSuggestions && typeof source.ignoredUpSuggestions === "object"
      ? source.ignoredUpSuggestions
      : {};
    const ignoredUpSuggestions = {};
    Object.entries(ignored).forEach(([uid, criteriaKey]) => {
      if (isSupportedCreatorId(uid) && typeof criteriaKey === "string") {
        ignoredUpSuggestions[uid] = criteriaKey.slice(0, 32);
      }
    });
    return {
      schemaVersion: SCHEMA_VERSION,
      entries,
      ignoredUpSuggestions,
    };
  }

  function normalizeAiCacheEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const bvid = extractVideoId(entry.bvid);
    if (!isSupportedVideoId(bvid) || typeof entry.match !== "boolean") return null;
    const confidence = Number(entry.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) return null;
    return {
      bvid,
      title: normalizeText(String(entry.title || "")).slice(0, 180),
      uid: isSupportedCreatorId(String(entry.uid || "")) ? String(entry.uid) : "",
      upName: normalizeText(String(entry.upName || "未知创作者")).slice(0, 80),
      match: entry.match,
      confidence,
      reason: normalizeText(String(entry.reason || "")).slice(0, 160),
      criteriaKey: String(entry.criteriaKey || "").slice(0, 32),
      judgedAt: isValidDateString(entry.judgedAt)
        ? entry.judgedAt
        : new Date().toISOString(),
    };
  }

  function normalizeMatchText(value) {
    return normalizeText(String(value || "").normalize("NFKC")).toLocaleLowerCase();
  }

  function validateRegexRule(rule) {
    const normalized = normalizeText(String(rule || ""));
    const match = normalized.match(/^\/([\s\S]+)\/$/);
    if (!match) {
      return { valid: false, reason: "正则规则必须写成 /内容/" };
    }
    const source = match[1];
    if (source.length > 100) {
      return { valid: false, reason: "正则内容不能超过 100 个字符" };
    }

    if (/\\(?:[1-9][0-9]*|k<[^>]+>)/u.test(source)) {
      return { valid: false, reason: "正则不能使用可能造成复杂回溯的反向引用" };
    }
    const simplified = source
      .replace(/\\./g, "x")
      .replace(/\[(?:\\.|[^\]\\])*\]/g, "x");
    const repeatedWildcard = /(?:\.\*|\.\+)[^|)]*(?:\.\*|\.\+)/u;
    if (hasUnsafeRepeatedGroup(simplified)
      || hasUnsafeQuantifierChain(source)
      || repeatedWildcard.test(simplified)) {
      return { valid: false, reason: "正则包含可能造成网页卡顿的重复匹配结构" };
    }

    try {
      return { valid: true, reason: "", regex: new RegExp(source, "iu") };
    } catch {
      return { valid: false, reason: "正则语法不正确" };
    }
  }

  function hasUnsafeRepeatedGroup(source) {
    const stack = [];
    let lastClosedGroup = null;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (character === "(") {
        const prefix = source.slice(index, index + 4);
        stack.push({
          hasAlternation: false,
          hasInnerQuantifier: false,
          hasAssertion: /^\(\?(?:[=!]|<[=!])/u.test(prefix),
        });
        lastClosedGroup = null;
        continue;
      }
      if (character === ")") {
        const closed = stack.pop();
        if (!closed) return true;
        const parent = stack.at(-1);
        if (parent) {
          parent.hasAlternation ||= closed.hasAlternation;
          parent.hasInnerQuantifier ||= closed.hasInnerQuantifier;
          parent.hasAssertion ||= closed.hasAssertion;
        }
        lastClosedGroup = closed;
        continue;
      }
      if (character === "|") {
        if (stack.length) stack.at(-1).hasAlternation = true;
        lastClosedGroup = null;
        continue;
      }

      const groupPrefixQuestion = character === "?"
        && source[index - 1] === "("
        && /[:=!<]/u.test(source[index + 1] || "");
      const isQuantifier = character === "+"
        || character === "*"
        || (character === "?" && !groupPrefixQuestion)
        || (character === "{" && /^\{\d+(?:,\d*)?\}/u.test(source.slice(index)));
      if (isQuantifier) {
        if (lastClosedGroup && (
          lastClosedGroup.hasAlternation
          || lastClosedGroup.hasInnerQuantifier
          || lastClosedGroup.hasAssertion
        )) return true;
        if (stack.length) stack.at(-1).hasInnerQuantifier = true;
        lastClosedGroup = null;
        continue;
      }
      if (!/\s/u.test(character)) lastClosedGroup = null;
    }
    return stack.length > 0;
  }

  function hasUnsafeQuantifierChain(source) {
    const tokenPattern = /(\[(?:\\.|[^\]\\])+\]|\\(?:p|P)\{[^}]+\}|\\.|\.|[\p{L}\p{N}_])(\*|\+|\?|\{\d+(?:,\d*)?\})/gu;
    let branchAtoms = new Set();
    let branchCount = 0;
    let previousEnd = 0;
    let match;
    while ((match = tokenPattern.exec(source))) {
      const gap = source.slice(previousEnd, match.index);
      if (containsRequiredRegexAtom(gap)) {
        branchAtoms = new Set();
        branchCount = 0;
      }
      const atom = match[1];
      const quantifier = match[2];
      const variable = !/^\{\d+\}$/u.test(quantifier);
      if (variable) {
        if (branchAtoms.has(atom)) return true;
        branchAtoms.add(atom);
        branchCount += 1;
        if (branchCount > 1) return true;
      } else {
        branchAtoms = new Set();
        branchCount = 0;
      }
      previousEnd = tokenPattern.lastIndex;
    }
    return false;
  }

  function containsRequiredRegexAtom(value) {
    const stripped = String(value || "")
      .replace(/[\^$()|?:=!<>]/g, "")
      .trim();
    return stripped.length > 0;
  }

  function getCompiledRegexRule(rule) {
    if (compiledRuleCache.has(rule)) return compiledRuleCache.get(rule);
    const validation = validateRegexRule(rule);
    const regex = validation.valid ? validation.regex : null;
    if (compiledRuleCache.size >= MAX_RULES_PER_LIST * 2) compiledRuleCache.clear();
    compiledRuleCache.set(rule, regex);
    return regex;
  }

  function findInvalidRegexRules(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((item) => normalizeText(item))
      .filter((item) => item.startsWith("/"))
      .map((rule) => ({ rule, ...validateRegexRule(rule) }))
      .filter((item) => !item.valid);
  }

  function matchTitleRules(title, ruleList) {
    const text = normalizeMatchText(title);
    for (const rule of normalizeRuleList(ruleList)) {
      if (rule.startsWith("/")) {
        const regex = getCompiledRegexRule(rule);
        if (regex?.test(text)) return rule;
      } else if (text.includes(normalizeMatchText(rule))) {
        return rule;
      }
    }
    return "";
  }

  function createCriteriaKey(settingsValue, learningValue) {
    const normalizedSettings = normalizeSettings(settingsValue);
    const normalizedLearning = normalizeLearning(learningValue);
    const samples = Object.values(normalizedLearning.samples)
      .sort((left, right) => right.addedAt.localeCompare(left.addedAt))
      .slice(0, MAX_PROMPT_SAMPLES)
      .map((sample) => [sample.title, sample.traits]);
    const payload = JSON.stringify({
      provider: normalizedSettings.provider,
      model: normalizedSettings.models[normalizedSettings.provider],
      description: normalizedSettings.description,
      profile: normalizedLearning.learnedProfile,
      samples,
    });
    let hash = 2166136261;
    for (let index = 0; index < payload.length; index += 1) {
      hash ^= payload.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `c${(hash >>> 0).toString(16)}`;
  }

  function normalizeModel(value, fallback) {
    const model = typeof value === "string" ? value.trim() : "";
    return (model || fallback).slice(0, 120);
  }

  function normalizeSecret(value) {
    return typeof value === "string" ? value.trim().slice(0, 500) : "";
  }

  function isValidDateString(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function saveSettings() {
    writeStoredObject(STORAGE_KEYS.settings, settings);
  }

  function saveSettingsAndSecrets() {
    saveSettings();
    writeStoredObject(STORAGE_KEYS.secrets, secrets);
  }

  function saveBlacklist() {
    writeStoredObject(STORAGE_KEYS.blacklist, blacklist);
  }

  function saveLearning() {
    learning = normalizeLearning(learning);
    writeStoredObject(STORAGE_KEYS.learning, learning);
  }

  function saveRules() {
    rules = normalizeRules(rules);
    writeStoredObject(STORAGE_KEYS.rules, rules);
  }

  function saveAiCache() {
    aiCache = normalizeAiCache(aiCache);
    writeStoredObject(STORAGE_KEYS.aiCache, aiCache);
  }
