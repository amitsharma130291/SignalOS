export type EvidenceStrength = "high" | "medium" | "low";

export type EvidenceStrengthInput = {
  title?: string | null;
  summary?: string | null;
  current_solution?: string | null;
  solution_gap?: string | null;
  frequency?: string | null;
  urgency?: string | null;
  affected_team?: string | null;
};

export type EvidenceAnalysis = {
  evidenceStrength: EvidenceStrength;
  evidenceScore: number;
  evidenceReasons: string[];
};

const EXPLICIT_IMPACT_TERMS = [
  "month-end close delays",
  "month end close delays",
  "month-end close keeps slipping",
  "close keeps slipping",
  "revenue loss",
  "audit risk",
  "missed escalations",
  "reporting delays",
  "forecast inaccuracies",
  "forecast accuracy issues",
];

const INFERRED_IMPACT_TERMS = [
  "might reduce visibility",
  "could create inefficiency",
  "may cause coordination issues",
  "visibility gaps",
  "coordination issues",
  "audit preparation",
  "audit-prep",
  "reporting inefficiency",
  "renewal visibility gaps",
  "ownership may be unclear",
];

const WORKFLOW_TERMS = [
  "export",
  "reconcile",
  "reconciliation",
  "manual",
  "spreadsheet",
  "forecast",
  "renewal",
  "candidate",
  "interview",
  "escalation",
  "compliance",
  "reporting",
  "consolidation",
];

const TOOL_TERMS = [
  "stripe",
  "netsuite",
  "salesforce",
  "hubspot",
  "airtable",
  "slack",
  "linkedin",
  "greenhouse",
  "zendesk",
  "spreadsheet",
  "spreadsheets",
  "internal systems",
];

const GENERIC_TERMS = [
  "operational work",
  "operational friction",
  "workflow friction",
  "generic operational",
  "manual operational workaround",
];

const CONSEQUENCE_TERMS = [
  "mismatches",
  "delays",
  "bottlenecks",
  "drift",
  "manual record cleanup",
  "manual cleanup",
  "visibility gaps",
  "ownership",
  "numbers rarely match",
  "inconsistent reporting",
];

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isUnknown(value?: string | null) {
  const normalized = normalize(value);
  return !normalized || normalized === "unknown";
}

function hasAny(text: string, terms: readonly string[]) {
  return terms.some((term) => text.includes(term));
}

function isOperationsCompliance(input: EvidenceStrengthInput, text: string) {
  return (
    normalize(input.affected_team).includes("operations") &&
    (text.includes("compliance") || text.includes("audit"))
  );
}

function addReason(reasons: string[], reason: string) {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function clampEvidenceScore(score: number) {
  return Math.max(0, Math.min(10, score));
}

export function getEvidenceScoreModifier(evidenceStrength?: EvidenceStrength | string | null) {
  if (evidenceStrength === "high") return 5;
  if (evidenceStrength === "low") return -5;
  return 0;
}

export function generateEvidenceStrength(input: EvidenceStrengthInput): EvidenceAnalysis {
  const text = [
    input.title,
    input.summary,
    input.current_solution,
    input.solution_gap,
    input.frequency,
    input.urgency,
    input.affected_team,
  ]
    .map((value) => normalize(value))
    .filter(Boolean)
    .join(" ");
  const reasons: string[] = [];
  let score = 0;

  if (!isUnknown(input.frequency)) {
    score += 2;
    addReason(reasons, "explicit frequency");
  } else {
    score -= 2;
    addReason(reasons, "frequency unknown");
  }

  const hasWorkflow = hasAny(text, WORKFLOW_TERMS);
  if (hasWorkflow && !hasAny(text, GENERIC_TERMS)) {
    score += 2;
    addReason(reasons, "explicit workflow");
  } else {
    score -= 1;
    addReason(reasons, "vague workflow");
  }

  if (!isUnknown(input.current_solution) && hasAny(normalize(input.current_solution), TOOL_TERMS)) {
    score += 2;
    addReason(reasons, "explicit tools");
  } else {
    addReason(reasons, "tools unclear");
  }

  const explicitImpact = hasAny(text, EXPLICIT_IMPACT_TERMS) && !isOperationsCompliance(input, text);
  const inferredImpact = hasAny(text, INFERRED_IMPACT_TERMS) || isOperationsCompliance(input, text);
  if (explicitImpact) {
    score += 2;
    addReason(reasons, "explicit business impact");
  } else if (inferredImpact) {
    score += 1;
    addReason(reasons, "business impact partially inferred");
  } else {
    score -= 2;
    addReason(reasons, "business impact unclear");
  }

  if (!isUnknown(input.affected_team)) {
    score += 1;
    addReason(reasons, "explicit team");
  }

  if (hasAny(text, CONSEQUENCE_TERMS)) {
    score += 1;
    addReason(reasons, "concrete operational consequence");
  }

  if (hasAny(text, GENERIC_TERMS)) {
    score -= 1;
    addReason(reasons, "vague pain statement");
  }

  let evidenceScore = clampEvidenceScore(score);

  if (!explicitImpact) {
    evidenceScore = Math.min(evidenceScore, 7);
  }

  if (normalize(input.affected_team).includes("support") && isUnknown(input.frequency) && !explicitImpact) {
    evidenceScore = Math.min(evidenceScore, 4);
  }

  if (evidenceScore >= 8 && explicitImpact) {
    return {
      evidenceStrength: "high",
      evidenceScore,
      evidenceReasons: reasons,
    };
  }

  if (normalize(input.affected_team).includes("support") && isUnknown(input.frequency) && !explicitImpact) {
    return {
      evidenceStrength: "low",
      evidenceScore,
      evidenceReasons: reasons,
    };
  }

  if (evidenceScore >= 5) {
    return {
      evidenceStrength: "medium",
      evidenceScore,
      evidenceReasons: reasons,
    };
  }

  return {
    evidenceStrength: "low",
    evidenceScore,
    evidenceReasons: reasons,
  };
}
