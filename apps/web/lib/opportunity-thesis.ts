import type { ActivationDecisionResult } from "./activation-decision.ts";
import type { BuyerMapping } from "./buyer-mapping-engine.ts";
import type { TrustState } from "./evidence-trust.ts";
import type { OpportunityReadiness } from "./opportunity-readiness.ts";
import type { SolutionGapAnalysis } from "./solution-gap-engine.ts";

export type OpportunityThesis = {
  thesisHeadline: string;
  executiveSummary: string;
  problem: string;
  problemSummary: string;
  problemSupportingDetail: string;
  painOwner: string;
  businessImpact: string;
  buyerPath: string;
  buyerPathRoles: OpportunityThesisBuyerPathRole[];
  economicCase: string;
  whyNow: string;
  whyCurrentSolutionFails: string;
  confidence: number;
  confidenceLabel: OpportunityThesisConfidenceLabel;
  confidenceExplanation: string;
  healthIndicators: OpportunityThesisHealthIndicator[];
};

export type OpportunityThesisBuyerPathRole = {
  label: "Champion" | "Buyer" | "Economic Buyer";
  value: string;
};

export type OpportunityThesisHealthIndicator = {
  label: string;
  status: "validated" | "warning";
};

export type OpportunityThesisConfidenceLabel =
  | "Very High Confidence"
  | "High Confidence"
  | "Moderate Confidence"
  | "Low Confidence";

type OpportunityKind =
  | "finance"
  | "sales_ops"
  | "customer_success"
  | "support"
  | "operations"
  | "general";

export type OpportunityThesisInput = {
  rawText?: string | null;
  pain?: string | null;
  affectedTeam?: string | null;
  frequency?: string | null;
  urgency?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  activationDecision: ActivationDecisionResult;
  opportunityReadiness: OpportunityReadiness;
  buyerMapping: BuyerMapping;
  solutionGapAnalysis: SolutionGapAnalysis;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function isKnown(value?: string | null) {
  const normalized = normalize(value);
  return Boolean(
    normalized &&
      normalized !== "unknown" &&
      !normalized.includes("evidence needed") &&
      !normalized.includes("requires validation"),
  );
}

function display(value?: string | null, fallback = "Unknown") {
  return isKnown(value) ? value?.trim() ?? fallback : fallback;
}

function isTrusted(trustState: TrustState) {
  return trustState === "validated" || trustState === "human_confirmed";
}

function sentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function compactList(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => isKnown(value));
}

function compactSentenceList(values: string[]) {
  return values.filter((value) => value.trim().length > 0);
}

function getOpportunityKind(input: OpportunityThesisInput): OpportunityKind {
  const text = getCombinedText(input);
  const team = normalize(input.buyerMapping.department || input.affectedTeam);

  if (team.includes("sales ops") || team.includes("sales operations")) return "sales_ops";
  if (team.includes("customer success")) return "customer_success";
  if (team.includes("support")) return "support";
  if (team.includes("operations")) return "operations";
  if (team.includes("finance")) return "finance";
  if (
    text.includes("month-end") ||
    text.includes("month end") ||
    text.includes("reconcile")
  ) {
    return "finance";
  }
  if (text.includes("forecast")) return "sales_ops";
  if (
    text.includes("renewal") ||
    text.includes("customer health")
  ) {
    return "customer_success";
  }
  if (text.includes("escalation")) return "support";
  if (text.includes("compliance") || text.includes("audit")) return "operations";

  return "general";
}

function toTeamLabel(input: OpportunityThesisInput) {
  const team = display(input.buyerMapping.department, display(input.affectedTeam, "Teams"));
  const normalized = normalize(team);

  if (normalized.endsWith("team") || normalized.endsWith("teams")) return team;
  if (normalized.endsWith("ops") || normalized.endsWith("operations")) return `${team} teams`;
  return `${team} teams`;
}

function getSolutionContext(input: OpportunityThesisInput) {
  const currentSolution = display(input.currentSolution, input.solutionGapAnalysis.currentSolution);
  if (currentSolution === "Unknown") return "the current workflow";

  const tools = currentSolution
    .split("+")
    .map((tool) => tool.trim())
    .filter(Boolean);

  if (tools.length === 0) return currentSolution;
  if (tools.length === 1) return tools[0];
  if (tools.length === 2) return `${tools[0]} and ${tools[1]}`;
  if (tools.length >= 4) return `${tools.slice(0, -1).join(", ")} + ${tools[tools.length - 1]}`;

  return `${tools.slice(0, -1).join(", ")}, and ${tools[tools.length - 1]}`;
}

function truncateSentence(value: string, maxLength: number) {
  const trimmed = sentence(value).replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;

  const clipped = trimmed.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip = lastSpace > 80 ? clipped.slice(0, lastSpace) : clipped;
  return `${safeClip.replace(/\s+(and|or)$/i, "").replace(/[,+\s]+$/, "")}.`;
}

function getImpactPhrase(input: OpportunityThesisInput, businessImpact: string) {
  const text = getCombinedText(input);
  const normalizedImpact = normalize(businessImpact);

  if (
    text.includes("month-end") ||
    text.includes("month end") ||
    text.includes("close") ||
    normalizedImpact.includes("month-end") ||
    normalizedImpact.includes("close")
  ) {
    return "month-end close delays";
  }
  if (text.includes("forecast") || normalizedImpact.includes("forecast")) {
    return "forecast inaccuracies";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "renewal visibility gaps";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "escalation delays";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "audit preparation pressure";
  }
  if (normalizedImpact !== "business impact requires validation.") {
    return businessImpact.replace(/[.]/g, "").toLowerCase();
  }

  return "operational friction";
}

function getPainCause(input: OpportunityThesisInput) {
  const text = getCombinedText(input);
  const solutionContext = getSolutionContext(input);

  if (text.includes("forecast")) {
    return `fragmented workflows across ${solutionContext}`;
  }
  if (text.includes("customer health") || text.includes("renewal")) {
    return `disconnected customer data across ${solutionContext}`;
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "manual compliance workflows";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "unclear escalation ownership";
  }
  if (text.includes("reconciliation") || text.includes("reconcile")) {
    return `manual reconciliation across ${solutionContext}`;
  }
  if (text.includes("spreadsheet")) {
    return "spreadsheet-driven workflows";
  }
  if (getToolCount(input.currentSolution) >= 3 || text.includes("multiple systems")) {
    return `fragmented workflows across ${solutionContext}`;
  }

  return `manual workflow execution across ${solutionContext}`;
}

function getCombinedText(input: OpportunityThesisInput) {
  return [
    input.rawText,
    input.pain,
    input.affectedTeam,
    input.frequency,
    input.urgency,
    input.currentSolution,
    input.solutionGap,
    input.solutionGapAnalysis.businessImpact,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function getProblemParts(input: OpportunityThesisInput) {
  const kind = getOpportunityKind(input);
  const solutionContext = getSolutionContext(input);

  if (kind === "finance") {
    return {
      summary: sentence(`Month-end reconciliation is performed manually across ${solutionContext}`),
      supportingDetail:
        "Teams spend significant effort cross-checking records and resolving exceptions.",
    };
  }
  if (kind === "sales_ops") {
    return {
      summary: sentence(`Forecast inputs are spread across ${solutionContext}`),
      supportingDetail:
        "Revenue teams reconcile pipeline changes manually before planning decisions.",
    };
  }
  if (kind === "customer_success") {
    return {
      summary: sentence(`Customer health and renewal signals are spread across ${solutionContext}`),
      supportingDetail: "Teams lack a reliable early-warning view of account risk.",
    };
  }
  if (kind === "support") {
    return {
      summary: "Escalation ownership is not consistently tracked.",
      supportingDetail: "Support teams lose time coordinating follow-up across tools and owners.",
    };
  }
  if (kind === "operations") {
    return {
      summary: sentence(`Compliance work is coordinated through ${solutionContext}`),
      supportingDetail: "Teams spend recurring effort preparing evidence and reconciling status.",
    };
  }

  const owner = display(input.affectedTeam, "The team");
  const gap = display(input.solutionGap, input.solutionGapAnalysis.rootCause);
  return {
    summary: sentence(`${owner} runs this workflow through ${solutionContext}`),
    supportingDetail: sentence(gap),
  };
}

function getPainOwner(input: OpportunityThesisInput) {
  const painOwner = input.opportunityReadiness.trustedFields.painOwner;
  if (isTrusted(painOwner.trustState)) return display(painOwner.value);
  return display(input.affectedTeam);
}

function getBusinessImpact(input: OpportunityThesisInput) {
  const impact = input.opportunityReadiness.trustedFields.businessImpact;
  if (isTrusted(impact.trustState)) {
    return sentence(display(impact.value, input.solutionGapAnalysis.businessImpact));
  }

  return "Business impact requires validation.";
}

function getBuyerPathRoles(input: OpportunityThesisInput): OpportunityThesisBuyerPathRole[] {
  const buyer = input.opportunityReadiness.trustedFields.buyer;
  const painOwner = getPainOwner(input);
  const champion = display(
    input.buyerMapping.decisionMap.champion,
    display(input.buyerMapping.champion, display(painOwner, "Unknown")),
  );
  const hasTrustedBuyerPath = isTrusted(buyer.trustState);
  const normalizedBuyer = isTrusted(buyer.trustState)
    ? display(input.buyerMapping.decisionMap.buyer ?? input.buyerMapping.buyer ?? input.buyer)
    : "Unknown";
  const economicBuyer = hasTrustedBuyerPath
    ? display(
        input.buyerMapping.decisionMap.economicBuyer,
        display(input.buyerMapping.economicOwner, display(input.budgetOwner, "Unknown")),
      )
    : "Unknown";

  if (champion === "Unknown" && normalizedBuyer === "Unknown" && economicBuyer === "Unknown") {
    return [];
  }

  const championValue = champion;
  const buyerValue =
    normalizedBuyer !== "Unknown" && normalize(normalizedBuyer) !== normalize(championValue)
      ? normalizedBuyer
      : "Unknown";
  const economicBuyerValue =
    economicBuyer !== "Unknown" &&
    normalize(economicBuyer) !== normalize(championValue) &&
    normalize(economicBuyer) !== normalize(buyerValue)
      ? economicBuyer
      : "Unknown";

  return [
    { label: "Champion", value: championValue || "Unknown" },
    { label: "Buyer", value: buyerValue || "Unknown" },
    { label: "Economic Buyer", value: economicBuyerValue || "Unknown" },
  ];
}

function getBuyerPath(input: OpportunityThesisInput) {
  const roles = getBuyerPathRoles(input);
  const knownRoles = roles.filter((role) => role.value !== "Unknown");

  if (roles.length === 0 || knownRoles.length === 0) {
    return "Buying path requires validation.";
  }

  return knownRoles.map((role) => role.value).join(" -> ");
}

function getEconomicCase(input: OpportunityThesisInput) {
  const economicCase = input.opportunityReadiness.trustedFields.economicCase;
  const kind = getOpportunityKind(input);
  const hasBudgetOwner =
    isTrusted(input.opportunityReadiness.trustedFields.budgetOwner.trustState) ||
    isTrusted(input.opportunityReadiness.trustedFields.economicBuyer.trustState);
  const evidenceText = compactList([economicCase.value, input.rawText, input.pain]).join(" ");
  const hoursMatch = evidenceText.match(/\b\d+\s*(?:-|to)\s*\d+\s*hours?\b|\b\d+\s*hours?\b/i);
  const ownershipNote = hasBudgetOwner
    ? "Economic ownership is mapped."
    : "Economic ownership still needs confirmation.";

  if (isTrusted(economicCase.trustState) && hasBudgetOwner) {
    if (hoursMatch) {
      return `Manual reconciliation consumes ${hoursMatch[0]} per week that could be spent on close review and exception resolution. Impact validated; ${ownershipNote}`;
    }

    if (kind === "sales_ops") {
      return `Forecast errors can misallocate pipeline coverage, rep coaching, and management attention. Impact validated; ${ownershipNote}`;
    }
    if (kind === "customer_success") {
      return `Late renewal-risk detection puts retention dollars and expansion planning at risk. Impact validated; ${ownershipNote}`;
    }
    if (kind === "support") {
      return `Manual escalation coordination consumes support capacity and raises the cost of complex cases. Impact validated; ${ownershipNote}`;
    }
    if (kind === "finance") {
      return `Manual close work consumes finance capacity and increases the cost of producing reliable operating numbers. Impact validated; ${ownershipNote}`;
    }

    return `Recurring workflow friction consumes operating capacity that could be used for higher-value review work. Impact validated; ${ownershipNote}`;
  }

  if (economicCase.trustState === "inferred") {
    if (kind === "sales_ops") {
      return `Forecast errors can misallocate pipeline coverage, rep coaching, and management attention. Impact not fully validated; ${ownershipNote}`;
    }
    if (kind === "customer_success") {
      return `Late renewal-risk detection puts retention dollars and expansion planning at risk. Impact not fully validated; ${ownershipNote}`;
    }
    if (kind === "support") {
      return `Manual escalation coordination consumes support capacity and raises the cost of complex cases. Impact not fully validated; ${ownershipNote}`;
    }
    if (kind === "finance") {
      return `Manual close work consumes finance capacity and increases the cost of producing reliable operating numbers. Impact not fully validated; ${ownershipNote}`;
    }

    return `Workflow friction consumes operating capacity that could be used for higher-value review work. Impact not fully validated; ${ownershipNote}`;
  }

  if (kind === "sales_ops") {
    return `Forecast errors can misallocate pipeline coverage, rep coaching, and management attention. Impact not validated; ${ownershipNote}`;
  }
  if (kind === "customer_success") {
    return `Late renewal-risk detection can put retention dollars and expansion planning at risk. Impact not validated; ${ownershipNote}`;
  }
  if (kind === "support") {
    return `Manual escalation coordination can consume support capacity and raise the cost of complex cases. Impact not validated; ${ownershipNote}`;
  }
  if (kind === "finance") {
    return `Manual close work can consume finance capacity and increase the cost of producing reliable operating numbers. Impact not validated; ${ownershipNote}`;
  }

  return `Workflow friction can consume operating capacity that could be used for higher-value review work. Impact not validated; ${ownershipNote}`;
}

function getWhyNow(input: OpportunityThesisInput) {
  const text = getCombinedText(input);
  const frequency = normalize(input.frequency);

  if (text.includes("month-end") || text.includes("month end") || text.includes("close")) {
    return "Close work recurs on a fixed reporting calendar, so unresolved exceptions carry into every cycle.";
  }
  if (text.includes("forecast")) {
    return "Forecast calls and pipeline reviews depend on current inputs before leadership commits the plan.";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "Renewal reviews are time-bound, so late risk discovery leaves fewer save options.";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "Escalations degrade quickly when ownership waits across queues.";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "Audit and compliance requests arrive on fixed deadlines that leave little room for manual catch-up.";
  }
  if (input.activationDecision.activationDecision === "MONITOR") {
    if (frequency === "daily" || frequency === "weekly") {
      return `The workflow occurs ${frequency} and creates recurring operational friction.`;
    }
    return "Additional evidence is required before timing can be assessed.";
  }
  if (text.includes("reporting delays") || text.includes("reporting risk")) {
    return "The reporting cycle is already active, making validation time-sensitive.";
  }
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") {
    return `The workflow runs ${frequency}, so small misses recur before the team can reset the process.`;
  }
  if (input.activationDecision.activationDecision === "ENGAGE") {
    return "Qualification evidence supports outreach now.";
  }

  return "Additional evidence is required before timing can be assessed.";
}

function getToolCount(currentSolution?: string | null) {
  if (!isKnown(currentSolution)) return 0;
  return String(currentSolution)
    .split("+")
    .map((tool) => tool.trim())
    .filter(Boolean).length;
}

function getWhyCurrentSolutionFails(input: OpportunityThesisInput) {
  const text = getCombinedText(input);
  const currentSolution = display(input.currentSolution, input.solutionGapAnalysis.currentSolution);
  const failureModes = input.solutionGapAnalysis.failureModes;

  if (text.includes("forecast")) {
    return "Because revenue operations data is fragmented across multiple GTM systems, forecast changes cannot be reconciled in one governed view.";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "Because customer health data is spread across several tools, account risk signals cannot be assembled before renewal review.";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "Because escalation ownership is not consistently tracked, handoffs cannot be routed reliably from Slack to the support system.";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "Because compliance evidence is coordinated manually, audit status cannot be kept current across owners and documents.";
  }
  if (text.includes("month-end") || text.includes("month end") || text.includes("reconcile")) {
    return "Because finance data is disconnected across systems, payout exceptions and ledger status cannot be reconciled in one workflow.";
  }
  if (text.includes("spreadsheet")) {
    return "Because spreadsheet coordination is manual, workflow state cannot stay current across owners.";
  }

  if (getToolCount(input.currentSolution) >= 3 || text.includes("multiple systems")) {
    return "Because workflow data is fragmented across systems, status changes cannot be governed from a single source of truth.";
  }

  if (failureModes.length > 0) {
    return sentence(`${currentSolution} fails through ${failureModes.slice(0, 2).join(" and ")}`);
  }

  if (isKnown(input.solutionGapAnalysis.rootCause)) {
    return sentence(input.solutionGapAnalysis.rootCause);
  }

  return "Because current workflow evidence is incomplete, the failure mechanism cannot be confirmed yet.";
}

function getWorkflowName(input: OpportunityThesisInput) {
  const text = getCombinedText(input);

  if (text.includes("reconciliation") || text.includes("reconcile")) {
    return text.includes("month-end") || text.includes("month end")
      ? "month-end reconciliation"
      : "reconciliation";
  }
  if (text.includes("forecast")) return "forecast management";
  if (text.includes("renewal") || text.includes("customer health")) return "renewal visibility";
  if (text.includes("compliance") || text.includes("audit")) return "compliance reporting";
  if (text.includes("reporting")) return "reporting";

  return "the workflow";
}

function getThesisHeadline(
  input: OpportunityThesisInput,
  businessImpact: string,
) {
  const team = toTeamLabel(input);
  const impact = getImpactPhrase(input, businessImpact);
  const cause = getPainCause(input).replace("Spreadsheets", "spreadsheets");

  return truncateSentence(`${team} are experiencing ${impact} caused by ${cause}`, 140);
}

function getOpeningNarrative(
  kind: OpportunityKind,
  team: string,
  workflowName: string,
  solutionContext: string,
) {
  if (kind === "finance") {
    return sentence(
      `${team} is relying on ${solutionContext} to complete ${workflowName}`,
    );
  }
  if (kind === "sales_ops") {
    return sentence(
      `${team} is trying to keep forecast inputs aligned across ${solutionContext}`,
    );
  }
  if (kind === "customer_success") {
    return sentence(
      `${team} is trying to understand renewal risk from customer signals spread across ${solutionContext}`,
    );
  }
  if (kind === "support") {
    return sentence(
      `${team} is managing escalation follow-up across ${solutionContext}`,
    );
  }
  if (kind === "operations") {
    return sentence(
      `${team} is coordinating audit and compliance work through ${solutionContext}`,
    );
  }

  return sentence(`${team} currently manages ${workflowName} across ${solutionContext}`);
}

function getExecutiveRootCause(input: OpportunityThesisInput) {
  const kind = getOpportunityKind(input);
  const solutionContext = getSolutionContext(input);

  if (kind === "finance") {
    return sentence(`The root cause is disconnected payment, ledger, and spreadsheet data across ${solutionContext}`);
  }
  if (kind === "sales_ops") {
    return sentence(`The root cause is pipeline data changing across systems without one governed forecast view`);
  }
  if (kind === "customer_success") {
    return sentence(`The root cause is customer health data moving across tools before renewal risk is assembled`);
  }
  if (kind === "support") {
    return sentence(`The root cause is escalation ownership moving across queues without a reliable handoff record`);
  }
  if (kind === "operations") {
    return sentence(`The root cause is audit evidence being tracked across documents, owners, and manual updates`);
  }

  return sentence(`The root cause is workflow state moving across systems without one governed operating view`);
}

function getExecutiveConsequence(input: OpportunityThesisInput) {
  const kind = getOpportunityKind(input);

  if (kind === "finance") {
    return "Finance leaders get slower exception review and less dependable close handoffs.";
  }
  if (kind === "sales_ops") {
    return "Revenue leaders spend planning time reconciling inputs instead of pressure-testing the forecast.";
  }
  if (kind === "customer_success") {
    return "Customer Success leaders lose time to diagnose account risk before renewal conversations.";
  }
  if (kind === "support") {
    return "Support leaders lose visibility into who owns the next action on complex customer issues.";
  }
  if (kind === "operations") {
    return "Operations leaders spend review time chasing evidence instead of resolving readiness gaps.";
  }

  return "Leaders lose operating visibility and spend review time reconstructing workflow status.";
}

function getTrustCoverage(readiness: OpportunityReadiness) {
  const fields = [
    readiness.trustedFields.workflow,
    readiness.trustedFields.businessImpact,
    readiness.trustedFields.painOwner,
    readiness.trustedFields.buyer,
    readiness.trustedFields.economicCase,
  ];
  const coverage = fields.reduce((sum, field) => {
    if (isTrusted(field.trustState)) return sum + 1;
    if (field.trustState === "inferred") return sum + 0.4;
    return sum;
  }, 0);

  return coverage / fields.length;
}

export function calculateOpportunityThesisConfidence(input: OpportunityThesisInput) {
  const readinessRatio =
    input.opportunityReadiness.totalMilestones === 0
      ? 0
      : input.opportunityReadiness.completedMilestones / input.opportunityReadiness.totalMilestones;
  const trustCoverage = getTrustCoverage(input.opportunityReadiness);
  const confidence =
    input.activationDecision.activationConfidence * 0.5 + readinessRatio * 0.3 + trustCoverage * 0.2;

  return Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));
}

export function getOpportunityThesisConfidenceLabel(
  confidence: number,
): OpportunityThesisConfidenceLabel {
  const percent = Math.round(confidence * 100);

  if (percent >= 95) return "Very High Confidence";
  if (percent >= 85) return "High Confidence";
  if (percent >= 70) return "Moderate Confidence";
  return "Low Confidence";
}

function getConfidenceExplanation(input: OpportunityThesisInput, confidence: number) {
  const label = getOpportunityThesisConfidenceLabel(confidence);
  const fields = input.opportunityReadiness.trustedFields;
  const missing = [
    isTrusted(fields.workflow.trustState) ? null : "workflow evidence",
    isTrusted(fields.buyer.trustState) ? null : "buyer clarity",
    isTrusted(fields.businessImpact.trustState) ? null : "impact validation",
    isTrusted(fields.economicCase.trustState) ? null : "economic impact validation",
    isTrusted(fields.budgetOwner.trustState) || isTrusted(fields.economicBuyer.trustState)
      ? null
      : "economic ownership validation",
  ].filter((value): value is string => Boolean(value));

  if (label === "Very High Confidence") {
    return "All qualification dimensions are validated: workflow evidence, buyer clarity, impact validation, economic impact, and economic ownership.";
  }
  if (label === "High Confidence") {
    return missing.length
      ? `Strong evidence exists across most dimensions; remaining gaps: ${missing.join(", ")}.`
      : "Strong evidence exists across workflow, buyer, impact, and economic dimensions.";
  }
  if (label === "Moderate Confidence") {
    return missing.length
      ? `Confidence is constrained by missing ${missing.join(", ")}.`
      : "Confidence is moderate because validation depth is still developing.";
  }

  return missing.length
    ? `Low confidence reflects missing ${missing.join(", ")}.`
    : "Low confidence reflects limited evidence depth across the opportunity.";
}

function getHealthIndicators(
  input: OpportunityThesisInput,
): OpportunityThesisHealthIndicator[] {
  const fields = input.opportunityReadiness.trustedFields;
  const problemValidated = isTrusted(fields.workflow.trustState);
  const buyerIdentified = isTrusted(fields.buyer.trustState);
  const economicCaseComplete = isTrusted(fields.economicCase.trustState);
  const economicOwnershipComplete =
    isTrusted(fields.budgetOwner.trustState) || isTrusted(fields.economicBuyer.trustState);
  const businessImpactValidated = isTrusted(fields.businessImpact.trustState);
  const indicators: OpportunityThesisHealthIndicator[] = [];

  if (problemValidated) indicators.push({ label: "Problem Validated", status: "validated" });
  indicators.push({
    label: buyerIdentified ? "Buyer Identified" : "Buyer Validation Needed",
    status: buyerIdentified ? "validated" : "warning",
  });
  indicators.push({
    label: businessImpactValidated ? "Impact Validated" : "Cost Validation Needed",
    status: businessImpactValidated ? "validated" : "warning",
  });
  indicators.push({
    label: economicCaseComplete ? "Economic Impact Validated" : "Economic Impact Needed",
    status: economicCaseComplete ? "validated" : "warning",
  });
  indicators.push({
    label: economicOwnershipComplete ? "Economic Ownership Validated" : "Economic Ownership Needed",
    status: economicOwnershipComplete ? "validated" : "warning",
  });

  return indicators;
}

function getExecutiveSummary(
  input: OpportunityThesisInput,
) {
  const kind = getOpportunityKind(input);
  const team = display(input.buyerMapping.department, display(input.affectedTeam, "The team"));
  const workflowName = getWorkflowName(input);
  const solutionContext = getSolutionContext(input);
  const summary = compactSentenceList([
    getOpeningNarrative(kind, team, workflowName, solutionContext),
    getExecutiveRootCause(input),
    getExecutiveConsequence(input),
  ]);

  return summary.slice(0, 3).join(" ");
}

export function generateOpportunityThesis(input: OpportunityThesisInput): OpportunityThesis {
  const confidence = calculateOpportunityThesisConfidence(input);
  const businessImpact = getBusinessImpact(input);
  const buyerPathRoles = getBuyerPathRoles(input);
  const problemParts = getProblemParts(input);
  const thesisWithoutSummary = {
    thesisHeadline: getThesisHeadline(input, businessImpact),
    problem: `${problemParts.summary}\n\n${problemParts.supportingDetail}`,
    problemSummary: problemParts.summary,
    problemSupportingDetail: problemParts.supportingDetail,
    painOwner: getPainOwner(input),
    businessImpact,
    buyerPath: getBuyerPath(input),
    buyerPathRoles,
    economicCase: getEconomicCase(input),
    whyNow: getWhyNow(input),
    whyCurrentSolutionFails: getWhyCurrentSolutionFails(input),
    confidence,
  };

  return {
    executiveSummary: getExecutiveSummary(input),
    ...thesisWithoutSummary,
    confidenceLabel: getOpportunityThesisConfidenceLabel(confidence),
    confidenceExplanation: getConfidenceExplanation(input, confidence),
    healthIndicators: getHealthIndicators(input),
  };
}
