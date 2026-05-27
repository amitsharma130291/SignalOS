export const POSITIVE_KEYWORD_WEIGHTS: Record<string, number> = {
  spreadsheet: 3,
  crm: 3,
  manual: 2,
  "manual process": 3,
  workflow: 2,
  repetitive: 2,
  operations: 2,
  handoff: 2,
  reporting: 2,
  support: 2,
  onboarding: 2,
  approval: 2,
  sop: 2,
  process: 1,
  backlog: 1,
  ticket: 1,
  "customer support": 2,
  "sales ops": 3,
  revops: 3,
  "finance ops": 3,
  "hr ops": 3,
  coordination: 2,
  "admin work": 2,
  "back office": 2,
  "internal tool": 3,
  bottleneck: 2,
  compliance: 2,
};

export const NEGATIVE_KEYWORD_WEIGHTS: Record<string, number> = {
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

function matchWeightedKeywords(
  haystack: string,
  weights: Record<string, number>,
): { matched: string[]; total: number } {
  const matched: string[] = [];
  let total = 0;

  const keywords = Object.keys(weights).sort((a, b) => b.length - a.length);

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      matched.push(keyword);
      total += weights[keyword] ?? 0;
    }
  }

  return { matched, total };
}

function matchMarketKeywords(haystack: string, keywords: readonly string[]) {
  const matched = keywords.filter((keyword) => haystack.includes(keyword));

  return {
    matched,
    total: matched.length,
  };
}

export function resolveMarketType(b2bScore: number, b2cScore: number): RawInputMarketType {
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
  const b2b = matchMarketKeywords(haystack, B2B_KEYWORDS);
  const b2c = matchMarketKeywords(haystack, B2C_KEYWORDS);

  const operationalScore = positive.total + negative.total;
  const marketType = resolveMarketType(b2b.total, b2c.total);
  const status = resolveFilterStatusFromScore(operationalScore, marketType, b2b.total, b2c.total);
  const confidence = resolveFilterConfidence(operationalScore, b2b.total, b2c.total);

  console.log({
    text: rawText,
    matchedB2BKeywords: b2b.matched,
    b2bScore: b2b.total,
  });

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
