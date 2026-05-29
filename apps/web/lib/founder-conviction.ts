export type FounderConvictionRecommendation = "high" | "medium" | "low";

export type FounderConvictionInput = {
  pain?: string | null;
  rawText?: string | null;
  urgency?: string | null;
  frequency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  affectedTeam?: string | null;
  monetizationScore?: number | null;
  validationScore?: number | null;
  filterScore?: number | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  triggerEvent?: string | null;
  targetTitles?: string[] | null;
  companySize?: string | null;
  industry?: string | null;
};

export type FounderConvictionResult = {
  score: number;
  reasons: string[];
  risks: string[];
  recommendation: FounderConvictionRecommendation;
};

const REVENUE_IMPACT_TERMS = [
  "revenue",
  "renewal",
  "churn",
  "forecast",
  "pipeline",
  "billing",
  "payments",
  "stripe",
  "netsuite",
  "month-end close",
  "month end close",
  "finance",
  "reporting deadlines",
  "compliance reporting",
  "compliance reporting deadline",
  "audit preparation",
  "audit-prep",
  "audits",
  "customer escalations",
  "sla",
  "missed urgent tickets",
];

const SEVERITY_TERMS = [
  "delays",
  "bottlenecks",
  "missed",
  "slipping",
  "mismatches",
  "visibility gaps",
  "manual reconciliation",
  "manual cleanup",
  "response delays",
  "reporting delays",
  "audit-prep bottlenecks",
  "compliance reporting delays",
  "close delays",
  "forecast accuracy issues",
];

const GENERIC_PAIN_TERMS = [
  "operational work",
  "operational friction",
  "workflow friction",
  "manual operational workaround",
  "generic operational",
  "no meaningful operational pain detected",
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

function getToolList(currentSolution?: string | null) {
  if (isUnknown(currentSolution)) return [];

  return Array.from(
    new Set(
      String(currentSolution)
        .split("+")
        .map((tool) => tool.trim())
        .filter(Boolean),
    ),
  );
}

function hasSpreadsheetPlusSaas(tools: string[]) {
  const normalizedTools = tools.map((tool) => tool.toLowerCase());
  const hasSpreadsheet = normalizedTools.some((tool) => tool.includes("spreadsheet") || tool.includes("sheet"));
  const hasSaas = normalizedTools.some((tool) =>
    ["stripe", "netsuite", "salesforce", "hubspot", "zendesk", "greenhouse", "airtable"].some((saas) =>
      tool.includes(saas),
    ),
  );

  return hasSpreadsheet && hasSaas;
}

function addUnique(values: string[], value: string) {
  if (!values.includes(value)) values.push(value);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function getRecommendation(score: number): FounderConvictionRecommendation {
  if (score >= 8) return "high";
  if (score >= 5) return "medium";
  return "low";
}

export function generateFounderConviction(input: FounderConvictionInput): FounderConvictionResult {
  const reasons: string[] = [];
  const risks: string[] = [];
  const combinedText = [
    input.rawText,
    input.pain,
    input.solutionGap,
    input.affectedTeam,
    input.buyer,
    input.budgetOwner,
    input.triggerEvent,
    input.industry,
  ]
    .map((value) => normalize(value))
    .filter(Boolean)
    .join(" ");
  const frequency = normalize(input.frequency);
  const urgency = normalize(input.urgency);
  const tools = getToolList(input.currentSolution);
  let score = 0;

  if (frequency === "daily") {
    score += 2;
    addUnique(reasons, "Daily workflow");
  } else if (frequency === "weekly") {
    score += 1.4;
    addUnique(reasons, "Weekly workflow");
  } else if (frequency === "monthly") {
    score += 0.6;
    addUnique(reasons, "Monthly workflow");
  } else if (frequency === "quarterly") {
    score += 0.3;
    addUnique(reasons, "Quarterly workflow");
  } else {
    addUnique(risks, "Unknown frequency");
  }

  if (hasAny(combinedText, REVENUE_IMPACT_TERMS)) {
    const impactBoost = ["revenue", "renewal", "forecast", "pipeline", "stripe", "netsuite", "month-end close", "payments"].filter((term) =>
      combinedText.includes(term),
    ).length;
    score += Math.min(2.2, 1.1 + impactBoost * 0.25);
    addUnique(reasons, "Revenue or budget impact");
  } else {
    addUnique(risks, "No clear monetization signal");
  }

  if (tools.length >= 3) {
    score += 1.8;
    addUnique(reasons, "Multi-system workflow");
  } else if (tools.length === 2) {
    score += 1;
    addUnique(reasons, "Two-system workflow");
  } else if (tools.length === 1) {
    score += 0.3;
    addUnique(risks, "Single-tool workflow");
  } else {
    addUnique(risks, "Unknown current solution");
  }

  if (hasSpreadsheetPlusSaas(tools)) {
    score += 0.4;
    addUnique(reasons, "Spreadsheets plus SaaS tools");
  }

  if (!isUnknown(input.buyer)) {
    score += 0.35;
    addUnique(reasons, "Clear buyer");
  } else {
    addUnique(risks, "Unknown buyer");
  }

  if (!isUnknown(input.budgetOwner)) {
    score += 0.35;
    addUnique(reasons, "Clear budget owner");
  } else {
    addUnique(risks, "Unknown budget owner");
  }

  if (!isUnknown(input.triggerEvent)) {
    score += 0.35;
    addUnique(reasons, "Clear trigger event");
  }

  if ((input.targetTitles?.length ?? 0) > 0) {
    score += 0.35;
    addUnique(reasons, "Target titles identified");
  }

  if (hasAny(combinedText, SEVERITY_TERMS)) {
    const severityCount = SEVERITY_TERMS.filter((term) => combinedText.includes(term)).length;
    score += Math.min(2, 0.9 + severityCount * 0.25);
    addUnique(reasons, "Pain severity is explicit");
  }

  if (urgency === "high") {
    score += 0.5;
    addUnique(reasons, "High urgency");
  } else if (urgency === "medium") {
    score += 0.2;
  } else if (urgency === "low") {
    addUnique(risks, "Low urgency");
  }

  if (typeof input.monetizationScore === "number") {
    if (input.monetizationScore >= 7) {
      score += 0.6;
      addUnique(reasons, "Strong monetization score");
    } else if (input.monetizationScore >= 4) {
      score += 0.3;
    } else {
      addUnique(risks, "No clear monetization signal");
    }
  }

  if (typeof input.validationScore === "number" && input.validationScore >= 70) {
    score += 0.3;
  } else if (typeof input.filterScore === "number" && input.filterScore <= 0) {
    score -= 1;
    addUnique(risks, "Sparse signal");
  }

  if (hasAny(combinedText, GENERIC_PAIN_TERMS)) {
    score -= 1.2;
    addUnique(risks, "Generic pain wording");
  }

  if (!hasAny(combinedText, REVENUE_IMPACT_TERMS) && !hasAny(combinedText, SEVERITY_TERMS) && tools.length === 0) {
    score = Math.min(score, 1);
    addUnique(risks, "No explicit operational consequence");
  }

  if (
    normalize(input.affectedTeam).includes("support") &&
    !/\bslas?\b/.test(combinedText) &&
    !combinedText.includes("missed urgent tickets")
  ) {
    score = Math.min(score, 7.5);
  }

  const finalScore = clampScore(score);

  return {
    score: finalScore,
    reasons,
    risks,
    recommendation: getRecommendation(finalScore),
  };
}
