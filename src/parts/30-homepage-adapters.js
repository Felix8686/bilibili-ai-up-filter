// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段

  function startPageObserver() {
    const handleNavigation = () => window.setTimeout(syncHomepageRuntime, 0);
    const handleNavigationStart = () => {
      invalidatePageContext();
      deactivateHomepageRuntime();
    };
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("hashchange", handleNavigation);
    document.addEventListener("yt-navigate-start", handleNavigationStart);
    document.addEventListener("yt-navigate-finish", handleNavigation);
    document.addEventListener("yt-page-data-updated", () => {
      if (!isHomepage()) return;
      ensureFeedObserver();
      scheduleScan(SCAN_DELAY_MS);
    });
    globalThis.navigation?.addEventListener?.("navigatesuccess", handleNavigation);
  }

  function syncHomepageRuntime() {
    syncPageContext();
    if (!isHomepage()) {
      deactivateHomepageRuntime();
      return;
    }
    ui.root.hidden = false;
    ensureFeedObserver();
    scheduleScan(0);
    window.setTimeout(processPendingLearning, 1000);
  }

  function deactivateHomepageRuntime() {
    window.clearTimeout(scanTimer);
    window.clearTimeout(feedLookupTimer);
    feedLookupTimer = 0;
    feedLookupAttempts = 0;
    feedObserver?.disconnect();
    feedObserver = null;
    feedRoot = null;
    clearHiddenCards();
    closeVideoContextMenu();
    ui.root.hidden = true;
  }

  function ensureFeedObserver() {
    if (!isHomepage()) return;
    const nextFeedRoot = findHomepageFeedRoot();
    if (!nextFeedRoot) {
      scheduleFeedLookup();
      return;
    }
    window.clearTimeout(feedLookupTimer);
    feedLookupTimer = 0;
    feedLookupAttempts = 0;
    if (feedRoot === nextFeedRoot && feedObserver) return;
    feedObserver?.disconnect();
    feedRoot = nextFeedRoot;
    feedObserver = new MutationObserver((records) => {
      const recommendationsChanged = records.some((record) => (
        record.addedNodes.length > 0 || record.removedNodes.length > 0
      ));
      if (recommendationsChanged) scheduleScan(SCAN_DELAY_MS);
    });
    feedObserver.observe(feedRoot, { childList: true, subtree: true });
  }

  function findHomepageFeedRoot(site = getActiveSiteConfig()) {
    if (!site || !isHomepage()) return null;
    if (globalThis.__BAF_FORCE_FEED_ROOT__) return document.body || document.documentElement;
    for (const selector of site.feedSelectors || []) {
      const root = document.querySelector(selector);
      if (root) return root;
    }
    return null;
  }

  function scheduleFeedLookup() {
    if (feedLookupTimer || !isHomepage()) return;
    const delay = feedLookupAttempts < FEED_LOOKUP_FAST_ATTEMPTS
      ? FEED_LOOKUP_DELAY_MS
      : FEED_LOOKUP_SLOW_DELAY_MS;
    feedLookupAttempts += 1;
    feedLookupTimer = window.setTimeout(() => {
      feedLookupTimer = 0;
      ensureFeedObserver();
      if (feedRoot) scheduleScan(0);
    }, delay);
  }

  function scheduleScan(delay = SCAN_DELAY_MS) {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanHomepage, delay);
  }

  function scanHomepage() {
    syncPageContext();
    const site = getActiveSiteConfig();
    if (!site || !isHomepage()) {
      clearHiddenCards();
      ui.summary.textContent = site
        ? `${site.label} 当前仅处理首页推荐`
        : "当前页面不在支持范围内";
      return;
    }

    ensureFeedObserver();
    if (!feedRoot) {
      ui.summary.textContent = `${site.label} 首页推荐区域加载中；尚未调用 AI`;
      return;
    }

    const candidates = collectCandidates(site, feedRoot);
    let hiddenCount = 0;
    let waitingCount = 0;

    candidates.forEach((candidate) => {
      candidate.card.dataset.bafUid = candidate.uid || "";
      candidate.card.dataset.bafSite = candidate.site;

      if (!settings.enabled) {
        setCardHidden(candidate.card, false);
        return;
      }

      const localDecision = getLocalDecision(candidate);
      if (localDecision.action !== "none") {
        sessionLocalRuleHits.add(candidate.fingerprint);
        setCardHidden(candidate.card, localDecision.action === "hide");
        if (localDecision.action === "hide") hiddenCount += 1;
        return;
      }

      let judgment = sessionJudgments.get(candidate.fingerprint);
      if (!judgment) {
        const cached = getCachedDecision(candidate);
        if (cached) {
          judgment = {
            state: isConfidentMatch(cached) ? "matched" : "complete",
            match: isConfidentMatch(cached),
            confidence: cached.confidence,
            reason: cached.reason,
          };
          sessionJudgments.set(candidate.fingerprint, judgment);
          sessionCacheHits.add(candidate.fingerprint);
        }
      }

      if (judgment?.state === "matched") {
        setCardHidden(candidate.card, true);
        hiddenCount += 1;
        return;
      }

      setCardHidden(candidate.card, false);
      if (judgment?.state === "queued" || judgment?.state === "evaluating") {
        if (pendingCandidates.has(candidate.fingerprint)) {
          pendingCandidates.set(candidate.fingerprint, {
            ...pendingCandidates.get(candidate.fingerprint),
            candidate,
          });
        }
        waitingCount += 1;
        return;
      }

      if (!judgment && canEvaluate()) {
        enqueueCandidate(candidate);
        waitingCount += 1;
      }
    });

    const missingConfig = settings.monitoringPaused
      ? "；自动 AI 监视已暂停，本地规则与缓存继续生效"
      : !hasFilterCriteria()
        ? "；AI 语义判断未配置，本地规则仍可使用"
        : !secrets.keys[settings.provider]
          ? "；请填写 API Key"
          : apiBlocked
            ? "；API 已暂停，请检查配置"
            : "";
    const savedCalls = sessionLocalRuleHits.size + sessionCacheHits.size;
    ui.summary.textContent = `${site.label} 首页识别 ${candidates.length} 个，隐藏 ${hiddenCount} 个，待判断 ${waitingCount} 个；本页已省 ${savedCalls} 次 AI 判断（本地 ${sessionLocalRuleHits.size}，缓存 ${sessionCacheHits.size}），实际送 AI ${sessionAiSent.size} 个${missingConfig}`;
    updateToggle();
  }

  function getLocalDecision(candidate) {
    if (learning.samples[candidate.bvid]) {
      return { action: "hide", source: "manual-bvid" };
    }
    if (candidate.uid && rules.upWhitelist[candidate.uid]) {
      return { action: "show", source: "up-whitelist" };
    }
    const whitelistRule = matchTitleRules(candidate.title, rules.titleWhitelist);
    if (whitelistRule) {
      return { action: "show", source: "title-whitelist", rule: whitelistRule };
    }
    if (candidate.uid && blacklist.entries[candidate.uid]) {
      return { action: "hide", source: "up-blacklist" };
    }
    const blacklistRule = matchTitleRules(candidate.title, rules.titleBlacklist);
    if (blacklistRule) {
      return { action: "hide", source: "title-blacklist", rule: blacklistRule };
    }
    return { action: "none", source: "none" };
  }

  function getCachedDecision(candidate) {
    const entry = aiCache.entries[candidate.bvid];
    const criteriaKey = createCriteriaKey(settings, learning);
    return isCachedDecisionReusable(entry, candidate, criteriaKey) ? entry : null;
  }

  function isCachedDecisionReusable(entry, candidate, criteriaKey) {
    return Boolean(entry
      && candidate
      && entry.bvid === candidate.bvid
      && entry.criteriaKey === criteriaKey);
  }

  function cacheAiDecision(candidate, result) {
    aiCache.entries[candidate.bvid] = {
      bvid: candidate.bvid,
      title: candidate.title,
      uid: candidate.uid,
      upName: candidate.upName,
      match: Boolean(result.match),
      confidence: Number(result.confidence),
      reason: result.reason,
      criteriaKey: createCriteriaKey(settings, learning),
      judgedAt: new Date().toISOString(),
    };
  }

  function resolveSiteId(hostname) {
    const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
    if (host === "www.bilibili.com") return "bilibili";
    if (host === "www.youtube.com" || host === "youtube.com") return "youtube";
    return "";
  }

  function isHomepageLocation(hostname, pathname) {
    const siteId = resolveSiteId(hostname);
    const path = String(pathname || "/");
    if (siteId === "bilibili") return path === "/" || path === "/index.html";
    if (siteId === "youtube") return path === "/";
    return false;
  }

  function getActiveSiteConfig() {
    const forcedSite = String(globalThis.__BAF_FORCE_SITE__ || "");
    if (SITE_CONFIGS[forcedSite]) return SITE_CONFIGS[forcedSite];
    if (globalThis.__BAF_FORCE_HOMEPAGE__) return SITE_CONFIGS.bilibili;
    return SITE_CONFIGS[resolveSiteId(location.hostname)] || null;
  }

  function getPageContextKey() {
    return `${resolveSiteId(location.hostname)}|${location.pathname}`;
  }

  function syncPageContext() {
    const nextKey = getPageContextKey();
    if (nextKey === lastPageContextKey) return;
    lastPageContextKey = nextKey;
    invalidatePageContext();
  }

  function invalidatePageContext() {
    monitoringGeneration += 1;
    resetSessionJudgments();
    closeVideoContextMenu();
  }

  function isHomepage() {
    return Boolean(globalThis.__BAF_FORCE_HOMEPAGE__)
      || isHomepageLocation(location.hostname, location.pathname);
  }

  function collectCandidates(site = getActiveSiteConfig(), root = feedRoot) {
    if (!site) return [];
    const searchRoot = root instanceof Element || root instanceof Document ? root : document;
    const candidates = [];
    const seenCards = new Set();
    searchRoot.querySelectorAll(site.videoIdSourceSelector).forEach((source) => {
      if (!(source instanceof Element) || ui.root.contains(source)) return;
      const link = source instanceof HTMLAnchorElement && source.matches(site.videoLinkSelector)
        ? source
        : findVideoLink(source, site);
      const card = findCard(source, site) || (link ? findCard(link, site) : null);
      if (!card || seenCards.has(card)) return;
      const candidate = buildCandidate(card, link, site);
      if (!candidate) return;
      seenCards.add(card);
      candidates.push(candidate);
    });
    return candidates;
  }

  function buildCandidate(card, link, site = getActiveSiteConfig()) {
    if (!site) return null;
    if (isExcludedCard(card, link, site)) return null;
    const bvid = getVideoId(card, link, site);
    if (!bvid) return null;
    const title = getVideoTitle(card, link, site);
    if (!title || title.length < 2) return null;
    const author = getAuthor(card, site);
    if (site.id === "youtube" && !author.uid) return null;
    return {
      fingerprint: bvid,
      site: site.id,
      bvid,
      title: title.slice(0, 180),
      uid: author.uid,
      upName: author.name.slice(0, 80),
      card,
    };
  }

  function isExcludedCard(card, link, site) {
    if (!(card instanceof Element) || site?.id !== "youtube") return false;
    const href = String(link?.getAttribute?.("href") || link?.href || "");
    if (/\/shorts\//i.test(href)) return true;
    if (card.closest("ytd-rich-section-renderer")) return true;
    if (card.hasAttribute("is-ad")) return true;
    return Boolean(card.querySelector([
      "ytd-ad-slot-renderer",
      "ytd-in-feed-ad-layout-renderer",
      "ytd-display-ad-renderer",
      "ytd-promoted-video-renderer",
    ].join(", ")));
  }

  function findVideoLink(root, site = getActiveSiteConfig()) {
    if (!(root instanceof Element) || !site) return null;
    if (root instanceof HTMLAnchorElement && root.matches(site.videoLinkSelector)) return root;
    return root.querySelector(site.videoLinkSelector);
  }

  function getVideoId(card, link, site = getActiveSiteConfig()) {
    if (!site) return "";
    const sources = [];
    if (link instanceof Element) sources.push(link);
    if (card instanceof Element) {
      sources.push(card);
      card.querySelectorAll(site.videoIdSourceSelector).forEach((source) => sources.push(source));
    }

    for (const source of sources) {
      const videoId = extractVideoIdFromElement(source, site);
      if (videoId) return videoId;
    }
    return "";
  }

  function extractVideoIdFromElement(element, site = getActiveSiteConfig()) {
    if (!(element instanceof Element)) return "";
    if (site?.id === "youtube") {
      const dataVideoId = String(element.getAttribute("data-video-id") || "").trim();
      if (/^[0-9A-Za-z_-]{11}$/.test(dataVideoId)) return `yt:${dataVideoId}`;
      for (const attribute of ["href", "data-url", "data-href"]) {
        const videoId = extractYouTubeVideoId(element.getAttribute(attribute));
        if (videoId) return videoId;
      }
      return extractYouTubeVideoId(element.href || "");
    }
    const dataBvid = extractVideoId(element.getAttribute("data-bvid"));
    if (dataBvid) return dataBvid;

    for (const attribute of ["data-aid", "data-av"]) {
      const rawValue = String(element.getAttribute(attribute) || "").trim();
      if (/^\d+$/.test(rawValue)) return `av${rawValue}`;
      const videoId = extractVideoId(rawValue);
      if (videoId) return videoId;
    }

    for (const attribute of ["href", "data-url", "data-href", "data-video-url", "data-uri"]) {
      const videoId = extractVideoId(element.getAttribute(attribute));
      if (videoId) return videoId;
    }
    return extractVideoId(element.href || "");
  }

  function findCard(link, site = getActiveSiteConfig()) {
    if (!(link instanceof Element) || !site) return null;
    for (const selector of site.cardSelectors) {
      const card = link.closest(selector);
      if (!card || card === document.body || card === document.documentElement) continue;
      const rect = card.getBoundingClientRect();
      if (rect.width > window.innerWidth * 0.97 && rect.height > window.innerHeight * 0.5) {
        continue;
      }
      return card;
    }
    return null;
  }

  function getVideoTitle(card, originalLink, site = getActiveSiteConfig()) {
    if (!site) return "";
    for (const selector of site.titleSelectors) {
      const node = card.querySelector(selector);
      const title = getNodeText(node);
      if (title && title.length >= 2) return title;
    }

    const links = card.querySelectorAll(site.videoLinkSelector);
    for (const link of links) {
      const title = getNodeText(link);
      if (title && title.length >= 2) return title;
    }
    return getNodeText(originalLink);
  }

  function getNodeText(node) {
    if (!node) return "";
    return normalizeText(
      node.getAttribute?.("title")
      || node.getAttribute?.("aria-label")
      || node.textContent
      || ""
    );
  }

  function getAuthor(card, site = getActiveSiteConfig()) {
    if (site?.id === "youtube") return getYouTubeAuthor(card, site);
    const spaceLink = card.querySelector('a[href*="space.bilibili.com/"]');
    const uid = extractUid(spaceLink?.href || "");
    let name = getNodeText(spaceLink);

    if (!name) {
      for (const selector of site?.authorSelectors || []) {
        name = getNodeText(card.querySelector(selector));
        if (name) break;
      }
    }

    name = name.replace(/^UP主\s*[:：]?\s*/i, "").trim();
    return { uid, name: name || "未知创作者" };
  }

  function getYouTubeAuthor(card, site) {
    let creatorLink = null;
    let name = "";
    for (const selector of site.authorSelectors) {
      const node = card.querySelector(selector);
      if (!node) continue;
      name = getNodeText(node);
      if (node instanceof HTMLAnchorElement) creatorLink = node;
      if (name || creatorLink) break;
    }
    const uid = extractYouTubeCreatorId(
      creatorLink?.getAttribute("href") || creatorLink?.href || ""
    );
    return { uid, name: name || "未知频道" };
  }

  function getDecodedParseValues(value) {
    const rawValue = String(value || "").trim();
    const values = [rawValue];
    try {
      const decoded = decodeURIComponent(rawValue);
      if (decoded !== rawValue) values.push(decoded);
    } catch {
      // Keep parsing the original value when a URL contains malformed escapes.
    }
    return values;
  }

  function extractYouTubeVideoId(value) {
    for (const current of getDecodedParseValues(value)) {
      const tagged = current.match(/^yt:([0-9A-Za-z_-]{11})$/i);
      if (tagged) return `yt:${tagged[1]}`;
      if (/(?:^|(?:www\.)?youtube\.com)\/watch(?:\?|$)/i.test(current)) {
        const watch = current.match(/[?&]v=([0-9A-Za-z_-]{11})(?=$|[&#])/i);
        if (watch) return `yt:${watch[1]}`;
      }
      const shortLink = current.match(/youtu\.be\/([0-9A-Za-z_-]{11})(?=$|[?&#/])/i);
      if (shortLink) return `yt:${shortLink[1]}`;
    }
    return "";
  }

  function extractVideoId(value) {
    const youtubeId = extractYouTubeVideoId(value);
    if (youtubeId) return youtubeId;

    for (const current of getDecodedParseValues(value)) {
      const bvidMatch = current.match(/(?:^|\/video\/|[?&#=])(BV[0-9A-Za-z]+)(?=$|[/?&#])/i);
      if (bvidMatch) return `BV${bvidMatch[1].slice(2)}`;
      const aidMatch = current.match(/(?:^|\/video\/|[?&#=])(av\d+)(?=$|[/?&#])/i);
      if (aidMatch) return `av${aidMatch[1].slice(2)}`;
    }
    return "";
  }

  function extractBvid(value) {
    const videoId = extractVideoId(value);
    return videoId.startsWith("BV") ? videoId : "";
  }

  function isSupportedVideoId(value) {
    return /^(?:BV[0-9A-Za-z]+|av\d+|yt:[0-9A-Za-z_-]{11})$/i
      .test(String(value || "").trim());
  }

  function extractUid(value) {
    const match = String(value || "").match(/space\.bilibili\.com\/(\d+)/i);
    return match ? match[1] : "";
  }

  function extractYouTubeCreatorId(value) {
    for (const current of getDecodedParseValues(value)) {
      const tagged = current.match(/^yt:(handle|channel|user|custom):([^\s|]{1,120})$/iu);
      if (tagged) {
        const suffix = tagged[1].toLowerCase() === "channel"
          ? tagged[2]
          : tagged[2].toLowerCase();
        return `yt:${tagged[1].toLowerCase()}:${suffix}`;
      }
      const handle = current.match(/(?:^|(?:www\.)?youtube\.com)\/@([^/?#\s|]{1,100})/iu);
      if (handle) return `yt:handle:${handle[1].toLowerCase()}`;
      const channel = current.match(/(?:^|(?:www\.)?youtube\.com)\/channel\/([0-9A-Za-z_-]{6,100})/i);
      if (channel) return `yt:channel:${channel[1]}`;
      const legacy = current.match(/(?:^|(?:www\.)?youtube\.com)\/(user|c)\/([^/?#\s|]{1,100})/iu);
      if (legacy) {
        const kind = legacy[1].toLowerCase() === "c" ? "custom" : "user";
        return `yt:${kind}:${legacy[2].toLowerCase()}`;
      }
    }
    return "";
  }

  function isSupportedCreatorId(value) {
    const uid = String(value || "").trim();
    return /^\d+$/.test(uid)
      || /^yt:(?:handle|channel|user|custom):[^\s|]{1,120}$/u.test(uid);
  }

  function formatCreatorId(uid) {
    return String(uid || "").startsWith("yt:")
      ? `频道标识：${uid}`
      : `UID：${uid}`;
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setCardHidden(card, hidden) {
    card.classList.toggle("baf-hidden", hidden);
  }

  function clearHiddenCards() {
    document.querySelectorAll(".baf-hidden").forEach((card) => {
      card.classList.remove("baf-hidden");
    });
  }
