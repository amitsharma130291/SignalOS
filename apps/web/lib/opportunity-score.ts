import type { ReviewStatus } from "./review-status.ts";

export type OpportunityScoreInput = {
  b2bScore?: number | null;
  monetizationScore?: number | null;
  urgency?: string | null;
  targetTitles?: unknown;
  icpGeneratedAt?: Date | string | null;
  rawInputStatus?: string | null;
  status?: ReviewStatus | string | null;
};

export type OpportunityScoreResult = {
  score: number;
  label: "low" | "medium" | "high";
  reasons: string[];
};

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function hasIcp(signal: OpportunityScoreInput) {
  return Boolean(
    signal.icpGeneratedAt ||
      (Array.isArray(signal.targetTitles) && signal.targetTitles.length > 0),
  );
}

export function calculateOpportunityScore(
  painSignal: OpportunityScoreInput,
): OpportunityScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const b2bScore = Math.max(0, painSignal.b2bScore ?? 0);
  if (b2bScore > 0) {
    const contribution = Math.min(30, b2bScore * 5);
    score += contribution;
    reasons.push(`B2B signal strength added ${contribution} points.`);
  }

  const monetizationScore = Math.max(0, painSignal.monetizationScore ?? 0);
  if (monetizationScore > 0) {
    const contribution = Math.min(25, monetizationScore * 2.5);
    score += contribution;
    reasons.push(`Monetization potential added ${Math.round(contribution)} points.`);
  }

  if (painSignal.urgency === "high") {
    score += 20;
    reasons.push("High urgency added 20 points.");
  } else if (painSignal.urgency === "medium") {
    score += 10;
    reasons.push("Medium urgency added 10 points.");
  }

  if (hasIcp(painSignal)) {
    score += 15;
    reasons.push("Generated ICP added 15 points.");
  }

  if (painSignal.rawInputStatus === "accepted") {
    score += 10;
    reasons.push("Accepted filter status added 10 points.");
  }

  if (painSignal.status === "approved") {
    score += 5;
    reasons.push("Human approval added 5 points.");
  }

  const finalScore = clampScore(score);
  const label = finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";

  return {
    score: finalScore,
    label,
    reasons: reasons.length > 0 ? reasons : ["Insufficient opportunity evidence."],
  };
}
