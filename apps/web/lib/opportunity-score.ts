import type { ReviewStatus } from "./review-status.ts";

export type OpportunityScoreInput = {
  b2bScore?: number | null;
  monetizationScore?: number | null;
  urgency?: string | null;
  rawText?: string | null;
  pain?: string | null;
  affectedTeam?: string | null;
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
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

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getText(signal: OpportunityScoreInput) {
  return [
    signal.rawText,
    signal.pain,
    signal.affectedTeam,
    signal.frequency,
    signal.currentSolution,
    signal.solutionGap,
  ]
    .map((value) => normalize(value))
    .filter(Boolean)
    .join(" ");
}

function getTools(currentSolution?: string | null) {
  const normalized = normalize(currentSolution);
  if (!normalized || normalized === "unknown") return [];

  return normalized
    .split("+")
    .map((tool) => tool.trim())
    .filter(Boolean);
}

function isFinanceReconciliation(text: string) {
  return (
    (text.includes("finance") || text.includes("stripe") || text.includes("netsuite")) &&
    (text.includes("reconciliation") ||
      text.includes("reconcile") ||
      text.includes("payout") ||
      text.includes("mismatch") ||
      text.includes("month-end close") ||
      text.includes("month end close"))
  );
}

function isQuarterlyCompliance(text: string, signal: OpportunityScoreInput) {
  return (
    normalize(signal.affectedTeam).includes("operations") &&
    normalize(signal.frequency) === "quarterly" &&
    (text.includes("compliance") || text.includes("audit")) &&
    (text.includes("spreadsheet") || text.includes("internal systems"))
  );
}

export function calculateOpportunityScore(
  painSignal: OpportunityScoreInput,
): OpportunityScoreResult {
  const reasons: string[] = [];
  let score = 0;
  const text = getText(painSignal);
  const tools = getTools(painSignal.currentSolution);

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

  if (isFinanceReconciliation(text)) {
    let contribution = 12;
    if (text.includes("stripe")) contribution += 4;
    if (text.includes("netsuite")) contribution += 4;
    if (text.includes("spreadsheet")) contribution += 3;
    if (text.includes("month-end close") || text.includes("month end close") || text.includes("close slipping")) {
      contribution += 4;
    }
    if (text.includes("half a day") || text.includes("hours") || text.includes("takes too long")) {
      contribution += 4;
    }
    contribution = Math.min(25, contribution);
    score += contribution;
    reasons.push(`Finance reconciliation workflow added ${contribution} points.`);
  }

  if (tools.length >= 3) {
    score += 8;
    reasons.push("Multi-tool workflow added 8 points.");
  } else if (tools.length === 2) {
    score += 4;
    reasons.push("Two-tool workflow added 4 points.");
  }

  if (isQuarterlyCompliance(text, painSignal)) {
    score -= 20;
    reasons.push("Quarterly compliance workflow reduced score by 20 points.");
  }

  const finalScore = clampScore(score);
  const label = finalScore >= 70 ? "high" : finalScore >= 40 ? "medium" : "low";

  return {
    score: finalScore,
    label,
    reasons: reasons.length > 0 ? reasons : ["Insufficient opportunity evidence."],
  };
}
