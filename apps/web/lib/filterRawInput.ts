export const POSITIVE_KEYWORDS = [
  "manual",
  "spreadsheet",
  "workflow",
  "repetitive",
  "operations",
  "crm",
  "handoff",
  "reporting",
  "support",
  "onboarding",
  "approval",
  "sop",
  "process",
  "backlog",
  "ticket",
  "customer support",
  "sales ops",
  "revops",
  "finance ops",
  "hr ops",
  "coordination",
  "admin work",
  "bottleneck",
  "compliance",
] as const;

export const NEGATIVE_KEYWORDS = [
  "gaming",
  "dating",
  "fitness",
  "recipe",
  "travel",
  "movie",
  "music",
  "fashion",
  "entertainment",
  "consumer app",
  "social media app",
  "habit tracker",
  "calorie tracker",
  "influencer",
  "personal productivity",
] as const;

export type RawInputFilterStatus = "accepted" | "filtered_out";

export type RawInputFilterResult = {
  status: RawInputFilterStatus;
  score: number;
  matchedPositiveKeywords: string[];
  matchedNegativeKeywords: string[];
  reason: string;
};

function matchKeywords(content: string, keywords: readonly string[]) {
  const uniqueMatches = new Set<string>();

  for (const keyword of keywords) {
    if (content.includes(keyword)) {
      uniqueMatches.add(keyword);
    }
  }

  return [...uniqueMatches];
}

export function filterRawInput(rawText: string, sourceName?: string | null): RawInputFilterResult {
  const normalizedText = rawText.toLowerCase();
  const normalizedSource = sourceName?.toLowerCase() ?? "";
  const haystack = `${normalizedText} ${normalizedSource}`.trim();

  const matchedPositiveKeywords = matchKeywords(haystack, POSITIVE_KEYWORDS);
  const matchedNegativeKeywords = matchKeywords(haystack, NEGATIVE_KEYWORDS);

  const positiveScore = matchedPositiveKeywords.length;
  const negativeScore = matchedNegativeKeywords.length;
  const score = positiveScore - negativeScore;
  const status: RawInputFilterStatus = positiveScore > negativeScore ? "accepted" : "filtered_out";

  return {
    status,
    score,
    matchedPositiveKeywords,
    matchedNegativeKeywords,
    reason: `Positive matches: ${positiveScore}, negative matches: ${negativeScore}.`,
  };
}
