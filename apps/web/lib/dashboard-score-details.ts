export function getVisibleScoreReasons(reasons: string[], expanded: boolean, limit = 2) {
  const safeReasons = reasons.filter((reason) => reason.trim().length > 0);
  return expanded ? safeReasons : safeReasons.slice(0, limit);
}

export function shouldShowScoreDetailsToggle(reasons: string[], limit = 2) {
  return reasons.filter((reason) => reason.trim().length > 0).length > limit;
}
