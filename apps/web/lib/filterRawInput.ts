export const POSITIVE_KEYWORD_WEIGHTS: Record<string, number> = {
  spreadsheet: 3,
  "crm fields": 3,
  crm: 4,
  manually: 2,
  manual: 3,
  "manual process": 3,
  "sales reps": 3,
  "customer call": 1,
  workflow: 3,
  repetitive: 2,
  operations: 3,
  handoff: 3,
  reporting: 3,
  support: 2,
  onboarding: 3,
  approval: 3,
  sop: 2,
  process: 1,
  backlog: 1,
  ticket: 1,
  "customer support": 2,
  "sales ops": 3,
  revops: 3,
  "finance ops": 3,
  "hr ops": 3,
  "candidate status": 2,
  "interview feedback": 2,
  "hiring managers": 2,
  scheduling: 1,
  coordination: 2,
  "admin work": 2,
  "back office": 2,
  "internal tool": 3,
  bottleneck: 2,
  compliance: 2,
};

export const NEGATIVE_KEYWORD_WEIGHTS: Record<string, number> = {
  occasionally: -2,
  discuss: -1,
  discussed: -1,
  "monthly meetings": -2,
  gaming: -3,
  dating: -3,
  fitness: -3,
  recipe: -3,
  travel: -2,
  movie: -2,
  music: -2,
  fashion: -2,
  entertainment: -2,
  "consumer app": -3,
  "social media app": -3,
  "habit tracker": -3,
  "calorie tracker": -3,
  influencer: -2,
  lifestyle: -2,
};

export const B2B_KEYWORDS = [
  "crm",
  "sales reps",
  "sales ops",
  "revops",
  "operations",
  "workflow",
  "spreadsheet",
  "reporting",
  "handoff",
  "support team",
  "onboarding",
  "back office",
  "internal tool",
  "manual process",
  "finance ops",
  "customer success",
  "compliance",
  "procurement",
  "admin work",
  "operations team",
  "sales team",
  "support ops",
] as const;

export const B2B_KEYWORD_WEIGHTS: Record<(typeof B2B_KEYWORDS)[number], number> = {
  crm: 4,
  "sales reps": 4,
  "sales ops": 4,
  revops: 4,
  operations: 3,
  workflow: 3,
  spreadsheet: 3,
  reporting: 3,
  handoff: 3,
  "support team": 3,
  onboarding: 3,
  "back office": 3,
  "internal tool": 3,
  "manual process": 3,
  "finance ops": 3,
  "customer success": 3,
  compliance: 3,
  procurement: 3,
  "admin work": 3,
  "operations team": 3,
  "sales team": 3,
  "support ops": 3,
};

export const B2C_KEYWORDS = [
  "influencer",
  "creator",
  "fitness",
  "dating",
  "social media",
  "lifestyle",
  "habit tracker",
  "gaming",
  "followers",
  "creator economy",
] as const;

export const B2C_KEYWORD_WEIGHTS: Record<(typeof B2C_KEYWORDS)[number], number> = {
  influencer: 3,
  creator: 2,
  fitness: 3,
  dating: 3,
  "social media": 3,
  lifestyle: 2,
  "habit tracker": 3,
  gaming: 3,
  followers: 2,
  "creator economy": 3,
};

export const FILTER_VERSION = "v3";

export type RawInputFilterStatus = "accepted" | "filtered_out" | "needs_review";
export type RawInputFilterConfidence = "high" | "medium" | "low";
export type RawInputMarketType = "b2b" | "b2c" | "unknown";

export type RawInputFilterResult = {
  status: RawInputFilterStatus;
  operationalScore: number;
  score: number;
  confidence: RawInputFilterConfidence;
  marketType: RawInputMarketType;
  b2bScore: number;
  b2cScore: number;
  matchedPositiveKeywords: string[];
  matchedNegativeKeywords: string[];
  matchedB2BKeywords: string[];
  matchedB2CKeywords: string[];
  reason: string;
  filterVersion: typeof FILTER_VERSION;
};

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function matchesKeyword(haystack: string, keyword: string) {
  const escapedKeyword = escapeRegex(keyword);
  const pluralSuffix = keyword.endsWith("s") ? "" : "s?";

  // Use word boundaries so substrings do not create false positives
  // (for example, "updating" must not match the B2C keyword "dating").
  // The optional plural suffix keeps common variants like "handoffs" and
  // "workflows" matched without falling back to naive substring matching.
  return new RegExp(`\\b${escapedKeyword}${pluralSuffix}\\b`, "i").test(haystack);
}

export function matchWeightedKeywords<TKeyword extends string>(
  haystack: string,
  weights: Record<TKeyword, number>,
): { matched: TKeyword[]; total: number } {
  const matched: string[] = [];
  let total = 0;

  const keywords = Object.keys(weights).sort((a, b) => b.length - a.length) as TKeyword[];

  for (const keyword of keywords) {
    if (matchesKeyword(haystack, keyword)) {
      matched.push(keyword);
      total += weights[keyword] ?? 0;
    }
  }

  return { matched: matched as TKeyword[], total };
}

export function resolveMarketType(b2bScore: number, b2cScore: number): RawInputMarketType {
  // Market classification compares accumulated B2B/B2C keyword evidence.
  if (b2bScore >= 3 && b2bScore > b2cScore) return "b2b";
  if (b2cScore >= 3 && b2cScore > b2bScore) return "b2c";
  return "unknown";
}

export function resolveFilterStatusFromScore(
  score: number,
  marketType: RawInputMarketType = "unknown",
  b2bScore = 0,
  b2cScore = 0,
): RawInputFilterStatus {
  // Thresholds favor clear operational B2B pain, keep weak signals for review,
  // and filter out low-ops or clearly consumer/lifestyle signals.
  if (score >= 5 && b2bScore > b2cScore) return "accepted";
  if (score <= 0 || b2cScore > b2bScore) return "filtered_out";
  if ((score >= 1 && score <= 4) || marketType === "unknown") return "needs_review";
  return "needs_review";
}

export function resolveFilterConfidence(
  score: number,
  b2bScore = 0,
  b2cScore = 0,
): RawInputFilterConfidence {
  // Confidence reflects strength of either operational evidence or market evidence.
  if (
    (score >= 5 && b2bScore > b2cScore) ||
    score <= -5 ||
    (b2cScore >= 3 && b2cScore > b2bScore)
  ) {
    return "high";
  }

  if (score >= 2 || Math.max(b2bScore, b2cScore) >= 2) {
    return "medium";
  }

  return "low";
}

function buildReason(
  status: RawInputFilterStatus,
  operationalScore: number,
  marketType: RawInputMarketType,
  b2bScore: number,
  b2cScore: number,
  positiveTotal: number,
  negativeTotal: number,
  matchedPositiveKeywords: string[],
  matchedNegativeKeywords: string[],
): string {
  const positivePart =
    matchedPositiveKeywords.length > 0
      ? `+${positiveTotal} from ${matchedPositiveKeywords.join(", ")}`
      : "no positive keyword hits";
  const negativePart =
    matchedNegativeKeywords.length > 0
      ? `-${Math.abs(negativeTotal)} from ${matchedNegativeKeywords.join(", ")}`
      : "no negative keyword hits";

  return `Operational score ${operationalScore} (${positivePart}; ${negativePart}). Market: ${marketType} (B2B ${b2bScore}, B2C ${b2cScore}). Status: ${status}.`;
}

// Internal smoke examples:
// "Manual spreadsheet CRM workflow with repetitive sales ops reporting handoffs." -> high ops, high B2B, accepted
// "Fitness social media app for influencers" -> high B2C, filtered_out
// "We have support challenges on the team" -> weak ops, needs_review, medium confidence
export function filterRawInput(rawText: string, sourceName?: string | null): RawInputFilterResult {
  const normalizedText = rawText.toLowerCase();
  const normalizedSource = sourceName?.toLowerCase() ?? "";
  const haystack = `${normalizedText} ${normalizedSource}`.trim();

  const positive = matchWeightedKeywords(haystack, POSITIVE_KEYWORD_WEIGHTS);
  const negative = matchWeightedKeywords(haystack, NEGATIVE_KEYWORD_WEIGHTS);
  const b2b = matchWeightedKeywords(haystack, B2B_KEYWORD_WEIGHTS);
  const b2c = matchWeightedKeywords(haystack, B2C_KEYWORD_WEIGHTS);

  const operationalScore = positive.total + negative.total;
  const marketType = resolveMarketType(b2b.total, b2c.total);
  const status = resolveFilterStatusFromScore(operationalScore, marketType, b2b.total, b2c.total);
  const confidence = resolveFilterConfidence(operationalScore, b2b.total, b2c.total);

  return {
    status,
    operationalScore,
    score: operationalScore,
    confidence,
    marketType,
    b2bScore: b2b.total,
    b2cScore: b2c.total,
    matchedPositiveKeywords: positive.matched,
    matchedNegativeKeywords: negative.matched,
    matchedB2BKeywords: b2b.matched,
    matchedB2CKeywords: b2c.matched,
    reason: buildReason(
      status,
      operationalScore,
      marketType,
      b2b.total,
      b2c.total,
      positive.total,
      negative.total,
      positive.matched,
      negative.matched,
    ),
    filterVersion: FILTER_VERSION,
  };
}
