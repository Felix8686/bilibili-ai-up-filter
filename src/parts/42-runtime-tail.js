// AI-Model-Signature: gpt-5.6-sol | 2026-07-19 | 初始化可组合的用户脚本源码片段

  function formatApiError(error, operation = "AI 判断") {
    const status = Number(error.status || 0);
    if (status === 401 || status === 403) return "API 鉴权失败，请检查 Key；自动判断已暂停";
    if (status === 429) return "API 请求过于频繁或额度不足，稍后重试";
    if (status >= 500) return `API 服务暂时异常（HTTP ${status}）`;
    return `${operation}失败：${error.message || "未知错误"}`;
  }

  function resetSessionJudgments() {
    sessionJudgments.clear();
    sessionAllowedUids.clear();
    pendingCandidates.clear();
    sessionLocalRuleHits.clear();
    sessionCacheHits.clear();
    sessionAiSent.clear();
    window.clearTimeout(batchTimer);
  }

  function cancelPendingEvaluations() {
    pendingCandidates.clear();
    for (const [fingerprint, judgment] of sessionJudgments) {
      if (judgment?.state === "queued" || judgment?.state === "evaluating") {
        sessionJudgments.delete(fingerprint);
      }
    }
    window.clearTimeout(batchTimer);
  }

  function setStatus(message, kind) {
    ui.status.textContent = message;
    ui.status.dataset.kind = kind || "";
  }

  function updateToggle() {
    const count = Object.keys(blacklist.entries).length
      + Object.keys(rules.upWhitelist).length
      + Object.keys(learning.samples).length
      + rules.titleBlacklist.length
      + rules.titleWhitelist.length;
    ui.toggle.textContent = !settings.enabled
      ? "AI 过滤已关"
      : settings.monitoringPaused
        ? `AI 已暂停 · ${count}`
        : `AI 过滤 · ${count}`;
    ui.root.classList.toggle("baf-monitor-paused", settings.monitoringPaused);
    ui.monitorToggle.textContent = settings.monitoringPaused ? "▶" : "⏸";
    ui.monitorToggle.setAttribute(
      "aria-label",
      settings.monitoringPaused ? "恢复自动 AI 监视" : "暂停自动 AI 监视"
    );
    ui.monitorToggle.title = settings.monitoringPaused
      ? "恢复自动 AI 监视"
      : "暂停自动 AI 监视；本地规则与缓存继续生效";
  }
})();
