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

function isEconomicCaseTrusted(input: OpportunityThesisInput) {
  return isTrusted(input.opportunityReadiness.trustedFields.economicCase.trustState);
}

function getConfidenceEconomicBase(confidence: number) {
  const label = getOpportunityThesisConfidenceLabel(confidence);

  if (label === "Very High Confidence") return "Economic impact appears validated.";
  if (label === "High Confidence") return "Economic impact appears likely but requires confirmation.";
  if (label === "Moderate Confidence") return "Economic impact is emerging but not fully validated.";
  return "Economic impact remains speculative.";
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

function getEconomicCase(input: OpportunityThesisInput, confidence: number) {
  const economicCase = input.opportunityReadiness.trustedFields.economicCase;
  const kind = getOpportunityKind(input);
  const hasBudgetOwner =
    isTrusted(input.opportunityReadiness.trustedFields.budgetOwner.trustState) ||
    isTrusted(input.opportunityReadiness.trustedFields.economicBuyer.trustState);
  const evidenceText = compactList([economicCase.value, input.rawText, input.pain]).join(" ");
  const hoursMatch = evidenceText.match(/\b\d+\s*(?:-|to)\s*\d+\s*hours?\b|\b\d+\s*hours?\b/i);
  const confidenceBase = getConfidenceEconomicBase(confidence);

  if (isTrusted(economicCase.trustState) && hasBudgetOwner) {
    if (hoursMatch) {
      return `${confidenceBase} Manual work creates ${hoursMatch[0]} per week of reporting overhead, which matters because close delays reduce operating visibility; exact cost ownership still needs confirmation.`;
    }

    if (kind === "sales_ops") {
      return `${confidenceBase} Forecast risk can distort revenue planning, which matters because leadership decisions depend on pipeline accuracy; economic ownership still needs confirmation.`;
    }
    if (kind === "customer_success") {
      return `${confidenceBase} Renewal visibility gaps create potential revenue exposure, which matters because missed risk signals can turn into churn; the size of revenue exposure still needs validation.`;
    }
    if (kind === "support") {
      return `${confidenceBase} Escalation delays create service-quality risk, which matters because slower response times can affect retention and support capacity; budget ownership still needs confirmation.`;
    }
    if (kind === "finance") {
      return `${confidenceBase} Reporting delays create close-cycle risk, which matters because finance teams lose confidence in operating numbers; exact cost impact still needs quantification.`;
    }

    return `${confidenceBase} Workflow friction creates operating risk, which matters because unresolved manual work compounds across repeated cycles; cost impact still needs validation.`;
  }

  if (economicCase.trustState === "inferred") {
    if (kind === "sales_ops") {
      return `${confidenceBase} Forecast quality appears impacted, creating planning risk for revenue teams; economic ownership still requires confirmation.`;
    }
    if (kind === "customer_success") {
      return `${confidenceBase} Renewal risk is evident, creating potential churn exposure; revenue impact has not yet been validated.`;
    }
    if (kind === "support") {
      return `${confidenceBase} Escalation inefficiencies are visible, creating customer experience and capacity risk; budget ownership remains unclear.`;
    }
    if (kind === "finance") {
      return `${confidenceBase} Reporting delays appear material, creating close-cycle risk; cost impact has not yet been quantified.`;
    }

    return `${confidenceBase} Operational friction is visible, creating execution risk; cost evidence and budget ownership remain incomplete.`;
  }

  if (kind === "sales_ops") {
    return `${confidenceBase} Forecast risk may affect revenue planning, but financial exposure and economic ownership remain unvalidated.`;
  }
  if (kind === "customer_success") {
    return `${confidenceBase} Renewal risk may create churn exposure, but revenue impact has not yet been validated.`;
  }
  if (kind === "support") {
    return `${confidenceBase} Escalation delays may create support capacity and customer experience risk, but budget ownership remains unclear.`;
  }
  if (kind === "finance") {
    return `${confidenceBase} Close delays may create reporting risk, but cost impact has not yet been quantified.`;
  }

  return `${confidenceBase} Operational risk may exist, but cost justification and buyer economics remain unvalidated.`;
}

function getWhyNow(input: OpportunityThesisInput) {
  const text = getCombinedText(input);
  const frequency = normalize(input.frequency);

  if (text.includes("month-end") || text.includes("month end") || text.includes("close")) {
    return "Month-end close delays create recurring reporting pressure every reporting cycle.";
  }
  if (text.includes("forecast")) {
    return "Forecast accuracy directly affects planning and revenue execution.";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "Renewal visibility gaps increase churn risk if left unresolved.";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "Escalation delays negatively impact customer experience and team responsiveness.";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "Audit preparation creates recurring compliance pressure.";
  }
  if (input.activationDecision.activationDecision === "MONITOR") {
    if (frequency === "daily" || frequency === "weekly") {
      return `The workflow occurs ${frequency} and creates recurring operational friction.`;
    }
    return "Additional evidence is required before timing can be assessed.";
  }
  if (text.includes("reporting delays") || text.includes("reporting risk")) {
    return "Reporting delays are already affecting operations.";
  }
  if (frequency === "daily" || frequency === "weekly" || frequency === "monthly") {
    return `The workflow occurs ${frequency} and creates recurring operational friction.`;
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
    return "Because revenue operations data is fragmented across multiple GTM systems, the team cannot maintain forecast confidence, resulting in slower planning and revenue execution.";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "Because customer health data is spread across several tools, the team cannot identify renewal risk early, resulting in avoidable churn exposure.";
  }
  if (text.includes("escalation") || text.includes("support")) {
    return "Because escalation ownership is not consistently tracked, the team cannot route follow-up reliably, resulting in slower response times and customer experience risk.";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "Because compliance evidence is coordinated manually, the team cannot stay audit-ready, resulting in recurring compliance pressure.";
  }
  if (text.includes("month-end") || text.includes("month end") || text.includes("reconcile")) {
    return "Because finance data is disconnected across systems, the team cannot resolve exceptions cleanly during close, resulting in reporting risk and close-cycle delays.";
  }
  if (text.includes("spreadsheet")) {
    return "Because spreadsheet coordination is manual, the team cannot keep workflow state current, resulting in reconciliation risk and slower execution.";
  }

  if (getToolCount(input.currentSolution) >= 3 || text.includes("multiple systems")) {
    return "Because workflow data is fragmented across systems, the team cannot maintain consistent visibility, resulting in cross-system manual work.";
  }

  if (failureModes.length > 0) {
    return sentence(`${currentSolution} fails through ${failureModes.slice(0, 2).join(" and ")}`);
  }

  if (isKnown(input.solutionGapAnalysis.rootCause)) {
    return sentence(input.solutionGapAnalysis.rootCause);
  }

  return "Because current workflow evidence is incomplete, the team cannot confirm the failure mode, resulting in unresolved validation risk.";
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

function getBuyerPathNarrative(kind: OpportunityKind, roles: OpportunityThesisBuyerPathRole[]) {
  const [champion, buyer, economicBuyer] = roles;
  const hasChampion = champion?.value && champion.value !== "Unknown";
  const buyingInfluencers = [buyer?.value, economicBuyer?.value].filter(
    (value): value is string => Boolean(value && value !== "Unknown"),
  );

  if (!hasChampion) return "Buyer ownership still needs to be mapped before engagement.";
  if (buyingInfluencers.length === 0) {
    return `Workflow ownership appears to sit with ${champion.value}, while buyer and economic owner still require validation.`;
  }

  const influence = buyingInfluencers.join(" and ");

  if (kind === "finance") {
    return sentence(
      `Workflow ownership appears to sit with ${champion.value}, with buying influence through ${influence}`,
    );
  }
  if (kind === "sales_ops") {
    return sentence(
      `This initiative is most likely being driven by ${champion.value}, with commercial ownership through ${influence}`,
    );
  }
  if (kind === "customer_success") {
    return sentence(
      `${champion.value} appears to be the primary stakeholder, with renewal ownership connected to ${influence}`,
    );
  }
  if (kind === "support") {
    return sentence(
      `${champion.value} appears closest to the operational pain, while ${influence} likely shapes purchasing approval`,
    );
  }

  return sentence(
    `${champion.value} appears to be the primary stakeholder, with buying influence through ${influence}`,
  );
}

function getOpeningNarrative(
  kind: OpportunityKind,
  painOwner: string,
  team: string,
  workflowName: string,
  solutionContext: string,
) {
  if (kind === "finance") {
    return sentence(
      `${team} is relying on ${solutionContext} to complete ${workflowName}, with ${painOwner} closest to the operating pain`,
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
      `${painOwner} appears closest to the escalation workflow, where ownership is tracked across ${solutionContext}`,
    );
  }
  if (kind === "operations") {
    return sentence(
      `${team} is coordinating audit and compliance work through ${solutionContext}`,
    );
  }

  return sentence(`${team} currently manages ${workflowName} across ${solutionContext}`);
}

function getValidationNarrative(input: OpportunityThesisInput, thesis: { economicCase: string }) {
  if (input.activationDecision.activationDecision === "ENGAGE") return "";

  if (!isEconomicCaseTrusted(input)) {
    if (thesis.economicCase.includes("Budget ownership") || thesis.economicCase.includes("budget")) {
      return "Budget ownership remains unresolved.";
    }
    if (thesis.economicCase.includes("Cost impact") || thesis.economicCase.includes("cost")) {
      return "Cost justification remains incomplete.";
    }
    return "Economic validation should be completed before engagement.";
  }

  return "Further qualification is recommended before outreach.";
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

function getConfidenceExplanation() {
  return "Confidence is based on evidence quality, buyer clarity, business impact validation, and workflow coverage.";
}

function getHealthIndicators(
  input: OpportunityThesisInput,
): OpportunityThesisHealthIndicator[] {
  const fields = input.opportunityReadiness.trustedFields;
  const problemValidated = isTrusted(fields.workflow.trustState);
  const buyerIdentified = isTrusted(fields.buyer.trustState);
  const economicCaseComplete = isTrusted(fields.economicCase.trustState);
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
    label: economicCaseComplete ? "Economic Impact Validated" : "Economic Validation Needed",
    status: economicCaseComplete ? "validated" : "warning",
  });

  return indicators;
}

function getExecutiveSummary(
  input: OpportunityThesisInput,
  thesis: Omit<
    OpportunityThesis,
    "executiveSummary" | "confidenceLabel" | "confidenceExplanation" | "healthIndicators"
  >,
) {
  const kind = getOpportunityKind(input);
  const team = display(input.buyerMapping.department, display(input.affectedTeam, "The team"));
  const workflowName = getWorkflowName(input);
  const solutionContext = getSolutionContext(input);
  const painOwner =
    thesis.painOwner === "Unknown" ? "The pain owner still requires validation" : thesis.painOwner;
  const validationNarrative = getValidationNarrative(input, thesis);
  const summary = compactSentenceList([
    getOpeningNarrative(kind, painOwner, team, workflowName, solutionContext),
    thesis.whyCurrentSolutionFails,
    thesis.buyerPath === "Buying path requires validation."
      ? "The buying path still requires validation."
      : getBuyerPathNarrative(kind, thesis.buyerPathRoles),
    thesis.economicCase,
    validationNarrative,
  ]);

  return summary.slice(0, 7).join(" ");
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
    economicCase: getEconomicCase(input, confidence),
    whyNow: getWhyNow(input),
    whyCurrentSolutionFails: getWhyCurrentSolutionFails(input),
    confidence,
  };

  return {
    executiveSummary: getExecutiveSummary(input, thesisWithoutSummary),
    ...thesisWithoutSummary,
    confidenceLabel: getOpportunityThesisConfidenceLabel(confidence),
    confidenceExplanation: getConfidenceExplanation(),
    healthIndicators: getHealthIndicators(input),
  };
}
