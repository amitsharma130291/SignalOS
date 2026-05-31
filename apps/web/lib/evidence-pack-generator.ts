import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { EvidenceAnalysis } from "./evidence-strength.ts";

export type EvidencePackInput = {
  rawText?: string | null;
  pain?: string | null;
  urgency?: string | null;
  frequency?: string | null;
  affectedTeam?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  monetizationScore?: number | null;
  founderConviction?: number | null;
  evidenceAnalysis?: EvidenceAnalysis | null;
  buyerMapping?: BuyerMapping | null;
};

export type EvidencePack = {
  researchSummary: string;
  evidenceDrivers: {
    positive: string[];
    negative: string[];
  };
  currentEvidence: {
    known: string[];
  };
  evidenceCategories: {
    label: string;
    items: string[];
  }[];
  evidenceGaps: {
    label: string;
    whyItMatters: string;
    evidenceNeeded: string;
  }[];
  validationPlan: {
    validationItem: string;
    whyItMatters: string;
    questionToAnswer: string;
    expectedConfidenceGain: "Low" | "Medium" | "High";
  }[];
  validationQuestions: string[];
  nextResearchActions: string[];
  evidenceUpgradePlan: {
    currentScore: number;
    targetScore: number;
    steps: string[];
    status: "achieved" | "needs_validation";
    message: string;
  };
};

const UNKNOWN = "Unknown";

const TOOL_LABELS = [
  ["stripe", "Stripe"],
  ["netsuite", "NetSuite"],
  ["salesforce", "Salesforce"],
  ["hubspot", "HubSpot"],
  ["airtable", "Airtable"],
  ["slack", "Slack"],
  ["zendesk", "Zendesk"],
  ["spreadsheet", "spreadsheets"],
  ["spreadsheets", "spreadsheets"],
  ["internal systems", "internal systems"],
] as const;

const VALIDATION_QUESTIONS_BY_GAP: Record<string, string> = {
  "Budget owner confirmation": "Who owns budget for solving this workflow?",
  "Quantified manual effort": "How much manual effort does this workflow require?",
  "Error/rework impact": "How often does this workflow create errors, rework, or business impact?",
  "Buyer role confirmation": "Which role evaluates and buys solutions for this workflow?",
  "Workflow frequency confirmation": "How often does this workflow occur?",
  "Workflow ownership confirmation": "Who owns the current workflow?",
  "Escalation business impact": "What customer, SLA, or churn impact comes from missed escalations?",
  "Compliance cost impact": "What cost, risk, delay, or headcount drag comes from compliance work?",
};

const VALIDATION_ITEMS_BY_GAP: Record<string, string> = {
  "Budget owner confirmation": "Confirm budget owner",
  "Quantified manual effort": "Quantify manual effort",
  "Error/rework impact": "Quantify error/rework impact",
  "Buyer role confirmation": "Confirm buyer role",
  "Workflow frequency confirmation": "Confirm workflow frequency",
  "Workflow ownership confirmation": "Confirm workflow ownership",
  "Escalation business impact": "Quantify escalation impact",
  "Compliance cost impact": "Quantify compliance cost impact",
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function display(value?: string | null) {
  return value?.trim() || UNKNOWN;
}

function isUnknown(value?: string | null) {
  const normalized = normalize(value);
  return !normalized || normalized === "unknown";
}

function addUnique(items: string[], item: string) {
  if (!items.includes(item)) items.push(item);
}

function hasExplicitBuyer(input: EvidencePackInput) {
  return !isUnknown(input.buyerMapping?.decisionMap.buyer);
}

function hasExplicitEconomicBuyer(input: EvidencePackInput) {
  return !isUnknown(input.buyerMapping?.decisionMap.economicBuyer);
}

function hasQuantifiedCost(text: string) {
  return text.includes("cost") || text.includes("revenue") || text.includes("dollar");
}

function hasQuantifiedTime(text: string) {
  return text.includes("hour") || text.includes("day");
}

function hasBusinessImpact(input: EvidencePackInput, text: string) {
  return (
    input.evidenceAnalysis?.evidenceReasons.includes("explicit business impact") ||
    text.includes("month-end close") ||
    text.includes("month end close") ||
    text.includes("reporting delays") ||
    text.includes("revenue") ||
    text.includes("cost")
  );
}

function hasTimeCostEvidence(text: string) {
  return hasQuantifiedTime(text) || text.includes("half a day") || text.includes("manual effort");
}

function getText(input: EvidencePackInput) {
  return [
    input.rawText,
    input.pain,
    input.urgency,
    input.frequency,
    input.affectedTeam,
    input.currentSolution,
    input.solutionGap,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function detectTools(text: string, currentSolution?: string | null) {
  const toolText = `${text} ${normalize(currentSolution)}`;
  const tools: string[] = [];

  for (const [needle, label] of TOOL_LABELS) {
    if (toolText.includes(needle)) addUnique(tools, label);
  }

  return tools;
}

function inferKnownEvidence(input: EvidencePackInput) {
  const text = getText(input);
  const known: string[] = [];
  const frequency = display(input.frequency);
  const team = display(input.affectedTeam);

  if (!isUnknown(input.frequency)) addUnique(known, `${frequency} workflow cadence`);
  if (!isUnknown(input.affectedTeam)) addUnique(known, `${team} team is affected`);

  for (const tool of detectTools(text, input.currentSolution)) {
    addUnique(known, `${tool} appears in the current workflow`);
  }

  if (text.includes("month-end close") || text.includes("month end close")) {
    addUnique(known, "month-end close delay is present");
  }
  if (text.includes("compliance")) addUnique(known, "compliance reporting workflow is present");
  if (text.includes("audit")) addUnique(known, "audit preparation is part of the workflow");
  if (
    text.includes("missed escalation") ||
    text.includes("missed escalations") ||
    text.includes("urgent issues are occasionally missed") ||
    text.includes("urgent issues can be missed")
  ) {
    addUnique(known, "missed escalations are present");
  }

  return known.length ? known : ["Problem narrative captured"];
}

function buildResearchSummary(input: EvidencePackInput, gaps: EvidencePack["evidenceGaps"]) {
  const text = getText(input);
  const team = isUnknown(input.affectedTeam) ? "The affected team" : display(input.affectedTeam);
  const buyer = input.buyerMapping?.decisionMap.buyer;
  const economicBuyer = input.buyerMapping?.decisionMap.economicBuyer;
  const tools = detectTools(text, input.currentSolution);
  const systems = tools.length ? ` through ${tools.join(", ")}` : "";
  const workflow = normalize(input.affectedTeam).includes("finance")
    ? "manually reconciles finance data"
    : normalize(input.affectedTeam).includes("support")
      ? "manages escalations"
      : normalize(input.affectedTeam).includes("operations")
        ? "manages reporting and compliance workflows"
        : "manages a recurring manual workflow";
  const impact = text.includes("month-end close") || text.includes("month end close")
    ? "Month-end close delays make the workflow operationally important."
    : text.includes("missed escalation") || text.includes("urgent issues")
      ? "Missed escalations create operational risk and workflow friction."
      : text.includes("audit") || text.includes("compliance")
        ? "Audit preparation and compliance reporting make the workflow operationally important."
        : "The workflow matters because manual ownership and follow-up create operational friction.";
  const owner = isUnknown(buyer)
    ? `${team} experiences the workflow pain`
    : isUnknown(economicBuyer)
      ? `${buyer} appears to evaluate solutions, while budget ownership needs confirmation`
      : `${buyer} appears to evaluate solutions and ${economicBuyer} owns budget decisions`;
  const unknowns = gaps.length
    ? gaps
        .slice(0, 3)
        .map((gap) => gap.label.toLowerCase())
        .join(", ")
    : "no major evidence gaps";

  return [
    `Problem: ${team} ${workflow}${systems}, and ${owner}.`,
    `Impact: ${impact}`,
    `Unknowns: ${unknowns}.`,
  ].join("\n");
}

function buildEvidenceCategories(input: EvidencePackInput, known: string[]) {
  const text = getText(input);
  const workflow: string[] = [];
  const systems = detectTools(text, input.currentSolution);
  const business: string[] = [];
  const ownership: string[] = [];
  const frequency = display(input.frequency);
  const team = display(input.affectedTeam);

  if (!isUnknown(input.frequency)) addUnique(workflow, `${frequency} workflow cadence`);
  if (text.includes("reconcile") || text.includes("reconciliation")) {
    addUnique(workflow, `${frequency === UNKNOWN ? "Manual" : frequency} reconciliation process`);
  }
  if (text.includes("reporting")) addUnique(workflow, "Reporting workflow");
  if (text.includes("escalation")) addUnique(workflow, "Escalation tracking workflow");
  if (!workflow.length && known.some((item) => item.includes("workflow"))) {
    addUnique(workflow, "Recurring workflow evidence");
  }

  if (text.includes("month-end close") || text.includes("month end close")) {
    addUnique(business, "Month-end close delays");
  }
  if (text.includes("compliance")) addUnique(business, "Compliance reporting");
  if (text.includes("audit")) addUnique(business, "Audit preparation");
  if (text.includes("missed escalation") || text.includes("urgent issues")) {
    addUnique(business, "Missed escalation risk");
  }

  if (!isUnknown(input.affectedTeam)) addUnique(ownership, `${team} affected`);

  return [
    { label: "Workflow Evidence", items: workflow },
    { label: "System Evidence", items: systems },
    { label: "Business Evidence", items: business },
    { label: "Ownership Evidence", items: ownership },
  ].filter((category) => category.items.length > 0);
}

function buildEvidenceGaps(input: EvidencePackInput) {
  const text = getText(input);
  const gaps: EvidencePack["evidenceGaps"] = [];

  if (!text.includes("budget")) {
    gaps.push({
      label: "Budget owner confirmation",
      whyItMatters: "Need proof that budget owner controls this KPI.",
      evidenceNeeded: "",
    });
  }

  if (!hasTimeCostEvidence(text)) {
    gaps.push({
      label: "Quantified manual effort",
      whyItMatters: "Need evidence of hours/week or manual effort.",
      evidenceNeeded: "",
    });
  }

  if (!hasQuantifiedCost(text) && !hasBusinessImpact(input, text)) {
    gaps.push({
      label: "Error/rework impact",
      whyItMatters: "Need evidence of errors, rework, cost, or business impact.",
      evidenceNeeded: "",
    });
  }

  if (!hasExplicitBuyer(input)) {
    gaps.push({
      label: "Buyer role confirmation",
      whyItMatters: "Need evidence of who evaluates or buys this solution.",
      evidenceNeeded: "",
    });
  }

  if (isUnknown(input.frequency)) {
    gaps.push({
      label: "Workflow frequency confirmation",
      whyItMatters: "Need evidence of how often the workflow occurs.",
      evidenceNeeded: "",
    });
  }

  if (text.includes("ownership") || text.includes("unclear")) {
    gaps.push({
      label: "Workflow ownership confirmation",
      whyItMatters: "Need evidence of who owns the current process.",
      evidenceNeeded: "",
    });
  }

  if (normalize(input.affectedTeam).includes("support")) {
    gaps.push({
      label: "Escalation business impact",
      whyItMatters: "Need evidence tying misses to SLA, churn, or customer impact.",
      evidenceNeeded: "",
    });
  }

  if (normalize(input.affectedTeam).includes("operations")) {
    gaps.push({
      label: "Compliance cost impact",
      whyItMatters: "Need evidence of cost, risk, delay, or headcount drag.",
      evidenceNeeded: "",
    });
  }

  return gaps;
}

function buildEvidenceDrivers(input: EvidencePackInput) {
  const text = getText(input);
  const positive: string[] = [];
  const negative: string[] = [];

  if (!isUnknown(input.affectedTeam)) addUnique(positive, "Clear affected team");
  if (
    input.evidenceAnalysis?.evidenceReasons.includes("explicit workflow") ||
    text.includes("workflow") ||
    text.includes("manual") ||
    text.includes("reporting") ||
    text.includes("reconciliation") ||
    text.includes("escalation")
  ) {
    addUnique(positive, "Clear workflow pattern");
  }
  if (!isUnknown(input.currentSolution)) addUnique(positive, "Current systems identified");
  if (hasExplicitBuyer(input)) addUnique(positive, "Buyer role identified");
  if ((input.evidenceAnalysis?.evidenceScore ?? 0) >= 8) addUnique(positive, "Strong source evidence");
  if (!isUnknown(input.frequency)) addUnique(positive, "Workflow frequency confirmed");
  if (hasBusinessImpact(input, text)) addUnique(positive, "Business impact identified");

  if ((input.evidenceAnalysis?.evidenceScore ?? 0) < 10) {
    if (!hasExplicitBuyer(input)) addUnique(negative, "Buyer role not confirmed");
    if (!hasExplicitEconomicBuyer(input)) addUnique(negative, "Missing budget confirmation");
    if (isUnknown(input.frequency)) addUnique(negative, "Workflow frequency not confirmed");
    if (!hasTimeCostEvidence(text)) addUnique(negative, "Missing time-cost estimate");
    if (!hasQuantifiedCost(text)) addUnique(negative, "Missing financial impact");
    if (isUnknown(input.urgency) || normalize(input.urgency) === "low") addUnique(negative, "Urgency not strongly evidenced");
    if ((input.evidenceAnalysis?.evidenceScore ?? 0) < 5) addUnique(negative, "Weak source evidence");
    if (!input.monetizationScore || input.monetizationScore <= 0) addUnique(negative, "Monetization not evidenced");
  }

  return { positive, negative };
}

function buildValidationQuestions(gaps: EvidencePack["evidenceGaps"]) {
  return gaps
    .map((gap) => VALIDATION_QUESTIONS_BY_GAP[gap.label])
    .filter((question): question is string => Boolean(question));
}

function getValidationQuestion(gapLabel: string) {
  return VALIDATION_QUESTIONS_BY_GAP[gapLabel] ?? `What evidence confirms ${gapLabel.toLowerCase()}?`;
}

function getValidationItem(gapLabel: string) {
  return VALIDATION_ITEMS_BY_GAP[gapLabel] ?? gapLabel;
}

function getExpectedConfidenceGain(gapLabel: string): "Low" | "Medium" | "High" {
  if (gapLabel === "Budget owner confirmation" || gapLabel.includes("impact")) return "High";
  if (gapLabel.includes("Buyer") || gapLabel.includes("manual effort")) return "Medium";
  return "Low";
}

function buildValidationPlan(gaps: EvidencePack["evidenceGaps"]): EvidencePack["validationPlan"] {
  return gaps.map((gap) => ({
    validationItem: getValidationItem(gap.label),
    whyItMatters: gap.whyItMatters,
    questionToAnswer: getValidationQuestion(gap.label),
    expectedConfidenceGain: getExpectedConfidenceGain(gap.label),
  }));
}

function buildNextResearchActions(input: EvidencePackInput, gaps: EvidencePack["evidenceGaps"]) {
  const currentScore = input.evidenceAnalysis?.evidenceScore ?? 0;
  const targetScore = getTargetScore(currentScore);

  if (currentScore >= targetScore || currentScore >= 8) {
    return [];
  }

  const actions: string[] = [];
  const labels = gaps.map((gap) => gap.label);

  if (labels.includes("Budget owner confirmation")) addUnique(actions, "Validate budget ownership.");
  if (labels.includes("Buyer role confirmation")) addUnique(actions, "Identify who evaluates this solution.");
  if (labels.includes("Quantified manual effort")) addUnique(actions, "Quantify manual effort.");
  if (labels.includes("Error/rework impact") || labels.includes("Compliance cost impact")) {
    addUnique(actions, "Quantify error, rework, cost, or risk impact.");
  }
  if (labels.includes("Escalation business impact")) addUnique(actions, "Quantify impact of missed escalations.");
  if (labels.includes("Workflow frequency confirmation")) addUnique(actions, "Confirm workflow frequency.");
  if (labels.includes("Workflow ownership confirmation")) addUnique(actions, "Confirm workflow ownership.");

  return actions.slice(0, 5);
}

function getTargetScore(currentScore: number) {
  return currentScore >= 8 ? 10 : currentScore >= 5 ? 8 : 6;
}

function buildUpgradePlan(input: EvidencePackInput, gaps: EvidencePack["evidenceGaps"]) {
  const currentScore = input.evidenceAnalysis?.evidenceScore ?? 0;
  const targetScore = getTargetScore(currentScore);
  const steps = gaps.map((gap) => {
    const scoreIncrease =
      gap.label === "Budget owner confirmation" || gap.label.includes("impact") ? "+2" : "+1";

    return `${scoreIncrease} score -> ${gap.label}`;
  });

  if (currentScore >= targetScore) {
    return {
      currentScore,
      targetScore,
      steps: [],
      status: "achieved" as const,
      message: "Evidence target achieved.",
    };
  }

  return {
    currentScore,
    targetScore,
    steps,
    status: "needs_validation" as const,
    message: "Additional validation required.",
  };
}

export function generateEvidencePack(input: EvidencePackInput): EvidencePack {
  const known = inferKnownEvidence(input);
  const evidenceGaps = buildEvidenceGaps(input);

  return {
    researchSummary: buildResearchSummary(input, evidenceGaps),
    evidenceDrivers: buildEvidenceDrivers(input),
    currentEvidence: {
      known,
    },
    evidenceCategories: buildEvidenceCategories(input, known),
    evidenceGaps,
    validationPlan: buildValidationPlan(evidenceGaps),
    validationQuestions: buildValidationQuestions(evidenceGaps),
    nextResearchActions: buildNextResearchActions(input, evidenceGaps),
    evidenceUpgradePlan: buildUpgradePlan(input, evidenceGaps),
  };
}
