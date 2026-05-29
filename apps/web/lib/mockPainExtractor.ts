import { classifyAffectedTeam } from "./extraction-classifier.ts";
import { matchesKeyword } from "./filterRawInput.ts";
import { generateOutreachAngle } from "./outreach-angle-generator.ts";
import { generatePainSummary } from "./pain-summary-generator.ts";

type FilterMetadata = {
  operationalScore?: number;
  b2bScore?: number;
  marketType?: string;
  status?: string;
  confidence?: string;
  matchedPositiveKeywords?: string[];
  matchedB2BKeywords?: string[];
};

export type MockPainExtractionResult = {
  pain: string;
  b2bScore: number;
  urgency: string;
  frequency: string;
  affectedTeam: string;
  existingWorkaround: string;
  currentSolution: string;
  solutionGap: string;
  possibleIcp: string;
  monetizationScore: number;
  outreachAngle: string;
  aiModel: "mock-v1";
  promptVersion: "mock-pain-extraction-v1";
  aiOutput: Record<string, unknown>;
};

const POSSIBLE_ICP_BY_TEAM: Record<string, string> = {
  "Sales Ops": "Sales Ops and RevOps teams at B2B companies",
  Support: "Support and customer support operations teams at B2B companies",
  "Customer Success": "Customer success and onboarding teams at B2B SaaS companies",
  "Finance Ops": "Finance and procurement teams at B2B companies",
  Recruiting: "Recruiting and talent operations teams at B2B companies",
  Operations: "Operations teams at B2B companies",
};

function getMatchedKeywords(rawText: string, keywords: readonly string[]) {
  return keywords.filter((keyword) => matchesKeyword(rawText, keyword));
}

function getPossibleIcp(affectedTeam: string) {
  return POSSIBLE_ICP_BY_TEAM[affectedTeam] ?? POSSIBLE_ICP_BY_TEAM.Operations;
}

function getExistingWorkaround(rawText: string) {
  const workarounds = getMatchedKeywords(rawText, [
    "manual spreadsheet",
    "spreadsheet",
    "crm fields",
    "crm workflow",
    "crm",
    "manually",
    "manual process",
    "manual",
    "handoff",
    "reporting",
  ]);

  if (workarounds.includes("manual spreadsheet") || workarounds.includes("spreadsheet")) {
    if (workarounds.includes("crm workflow") || workarounds.includes("crm")) {
      return "Manual spreadsheets and CRM workflows";
    }

    return "Manual spreadsheets";
  }

  if (workarounds.includes("crm fields")) {
    return "Manual CRM field updates";
  }

  if (workarounds.includes("manual process") || workarounds.includes("manual")) {
    return "Manual processes";
  }

  if (workarounds.includes("handoff") || workarounds.includes("reporting")) {
    return "Manual reporting and handoffs";
  }

  return "Manual operational workaround";
}

function getFrequency(rawText: string) {
  if (
    matchesKeyword(rawText, "after every call") ||
    matchesKeyword(rawText, "after every customer call") ||
    matchesKeyword(rawText, "every customer call") ||
    matchesKeyword(rawText, "each invoice cycle")
  ) {
    return "per_event";
  }

  if (
    matchesKeyword(rawText, "daily") ||
    matchesKeyword(rawText, "every day") ||
    matchesKeyword(rawText, "throughout the day") ||
    matchesKeyword(rawText, "multiple times a day") ||
    matchesKeyword(rawText, "multiple times per day") ||
    matchesKeyword(rawText, "several times a day") ||
    matchesKeyword(rawText, "several times per day") ||
    matchesKeyword(rawText, "many times a day") ||
    matchesKeyword(rawText, "many times per day")
  ) {
    return "daily";
  }
  if (
    matchesKeyword(rawText, "quarterly") ||
    matchesKeyword(rawText, "every quarter") ||
    matchesKeyword(rawText, "quarterly review")
  ) {
    return "quarterly";
  }
  if (
    matchesKeyword(rawText, "weekly") ||
    matchesKeyword(rawText, "every week") ||
    matchesKeyword(rawText, "every monday") ||
    matchesKeyword(rawText, "every tuesday") ||
    matchesKeyword(rawText, "every wednesday") ||
    matchesKeyword(rawText, "every thursday") ||
    matchesKeyword(rawText, "every friday")
  ) {
    return "weekly";
  }
  if (matchesKeyword(rawText, "monthly") || matchesKeyword(rawText, "every month")) return "monthly";
  if (matchesKeyword(rawText, "constantly") || matchesKeyword(rawText, "repeatedly")) return "repeated";
  return "unknown";
}

function getCurrentSolution(rawText: string) {
  const solutions: string[] = [];

  if (matchesKeyword(rawText, "netsuite")) solutions.push("NetSuite");
  if (
    matchesKeyword(rawText, "stripe") ||
    matchesKeyword(rawText, "payouts") ||
    matchesKeyword(rawText, "billing data") ||
    matchesKeyword(rawText, "payments")
  ) {
    solutions.push("Stripe");
  }
  if (matchesKeyword(rawText, "salesforce")) solutions.push("Salesforce");
  if (matchesKeyword(rawText, "hubspot")) solutions.push("HubSpot");
  if (matchesKeyword(rawText, "linkedin")) solutions.push("LinkedIn");
  if (matchesKeyword(rawText, "greenhouse")) solutions.push("Greenhouse");
  if (matchesKeyword(rawText, "zendesk")) solutions.push("Zendesk");
  if (matchesKeyword(rawText, "airtable")) solutions.push("Airtable");
  if (matchesKeyword(rawText, "excel")) solutions.push("Excel");
  if (matchesKeyword(rawText, "google sheets")) solutions.push("Google Sheets");
  if (matchesKeyword(rawText, "slack")) solutions.push("Slack");
  if (matchesKeyword(rawText, "email")) solutions.push("Email");
  if (matchesKeyword(rawText, "spreadsheet") || matchesKeyword(rawText, "spreadsheets")) {
    solutions.push("Spreadsheets");
  }
  if (
    matchesKeyword(rawText, "internal systems") ||
    matchesKeyword(rawText, "several systems") ||
    matchesKeyword(rawText, "six internal systems")
  ) {
    solutions.push("Internal systems");
  }
  if (matchesKeyword(rawText, "crm")) solutions.push("CRM");

  const uniqueSolutions = Array.from(new Set(solutions));
  if (uniqueSolutions.length) return uniqueSolutions.join(" + ");
  if (matchesKeyword(rawText, "manual process") || matchesKeyword(rawText, "manual")) {
    return "Manual process";
  }

  return "Unknown";
}

function matchesAnyKeyword(rawText: string, keywords: readonly string[]) {
  return keywords.some((keyword) => matchesKeyword(rawText, keyword));
}

function getSolutionGap(rawText: string) {
  if (
    matchesKeyword(rawText, "hubspot") &&
    matchesKeyword(rawText, "airtable") &&
    matchesKeyword(rawText, "slack") &&
    matchesKeyword(rawText, "salesforce") &&
    (matchesKeyword(rawText, "spreadsheet") || matchesKeyword(rawText, "spreadsheets")) &&
    matchesKeyword(rawText, "forecast meeting") &&
    (matchesKeyword(rawText, "validates numbers") || matchesKeyword(rawText, "validate numbers"))
  ) {
    return "Manual validation across multiple sales tools creates forecasting delays, reporting accuracy issues, and visibility gaps.";
  }

  if (
    matchesAnyKeyword(rawText, [
      "outdated crm",
      "outdated crm data",
      "forecast accuracy",
      "forecast delay",
      "forecast delays",
      "forecasting delay",
      "forecasting delays",
      "manual validation",
      "manual verification",
      "manually verify pipeline numbers",
      "missed update",
      "missed updates",
      "pipeline reporting",
      "reporting accuracy",
      "forecast reviews take hours",
      "leadership loses confidence",
    ])
  ) {
    return "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.";
  }

  if (
    matchesAnyKeyword(rawText, [
      "health score review",
      "health scores",
      "renewal visibility",
      "renewal risk review",
      "manually aggregating customer health metrics",
      "status update coordination",
      "status updates coordination",
    ]) ||
    ((matchesKeyword(rawText, "manual cleanup") ||
      matchesKeyword(rawText, "manually clean customer records") ||
      matchesKeyword(rawText, "cleanup") ||
      matchesKeyword(rawText, "cross-checking") ||
      matchesKeyword(rawText, "cross checking")) &&
      (matchesKeyword(rawText, "customer success") ||
        matchesKeyword(rawText, "renewal") ||
        matchesKeyword(rawText, "renewals") ||
        matchesKeyword(rawText, "health score") ||
        matchesKeyword(rawText, "account")))
  ) {
    return "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.";
  }

  if (
    matchesAnyKeyword(rawText, [
      "reconciliation mismatch",
      "reconciliation mismatches",
      "exception tracking",
      "month-end close",
      "month end close",
      "month-end close delays",
      "month end close delays",
      "reporting deadlines",
    ]) ||
    ((matchesKeyword(rawText, "cross-checking") || matchesKeyword(rawText, "cross checking")) &&
      (matchesKeyword(rawText, "finance") ||
        matchesKeyword(rawText, "reconciliation") ||
        matchesKeyword(rawText, "netsuite") ||
        matchesKeyword(rawText, "month-end close") ||
        matchesKeyword(rawText, "month end close")))
  ) {
    return "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.";
  }

  if (
    matchesAnyKeyword(rawText, [
      "interview scheduling",
      "interview scheduling delays",
      "interview coordination",
      "manual status updates",
      "manually update candidate status",
      "interview feedback",
      "candidate scheduling",
      "candidate scheduling delays",
      "scheduling delay",
      "scheduling delays",
      "feedback bottlenecks",
      "hiring manager feedback",
      "candidate response delays",
    ]) ||
    (matchesKeyword(rawText, "candidate information") &&
      matchesKeyword(rawText, "linkedin") &&
      matchesKeyword(rawText, "greenhouse"))
  ) {
    return "Manual status updates and scattered interview feedback create scheduling delays and recruiting coordination bottlenecks.";
  }

  if (
    matchesKeyword(rawText, "reconciliation cleanup") ||
    (matchesKeyword(rawText, "reconciliation") && matchesKeyword(rawText, "cleanup")) ||
    matchesKeyword(rawText, "reconcile") ||
    matchesKeyword(rawText, "reconciles") ||
    matchesKeyword(rawText, "reconciled") ||
    matchesKeyword(rawText, "reconciling")
  ) {
    return "Manual reconciliation creates cleanup work and reporting delays.";
  }

  if (matchesKeyword(rawText, "manual cleanup") || matchesKeyword(rawText, "cleanup")) {
    return "Manual cleanup creates extra follow-up work and delays.";
  }

  if (matchesKeyword(rawText, "reporting delays") || matchesKeyword(rawText, "slow reporting")) {
    return "Manual tracking creates reporting delays and follow-up work.";
  }

  if (
    matchesAnyKeyword(rawText, [
      "response times slipping",
      "response times are slipping",
      "response time increases",
      "response times increase",
      "response delays",
      "missed escalation",
      "missed escalations",
      "missed ticket",
      "missed tickets",
      "ownership unclear",
      "ownership is unclear",
      "escalation workflow",
      "escalation spreadsheets",
      "coordinate escalations",
      "escalation ownership confusion",
      "escalations getting lost",
      "escalations are getting lost",
    ]) ||
    (matchesKeyword(rawText, "visibility gaps") &&
      (matchesKeyword(rawText, "support") ||
        matchesKeyword(rawText, "ticket") ||
        matchesKeyword(rawText, "tickets") ||
        matchesKeyword(rawText, "zendesk"))) ||
    matchesKeyword(rawText, "no reliable workflow") ||
    matchesKeyword(rawText, "manual tracking") ||
    matchesKeyword(rawText, "coordination issues")
  ) {
    return "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.";
  }

  if (
    matchesKeyword(rawText, "compliance information") ||
    matchesKeyword(rawText, "audit preparation") ||
    matchesKeyword(rawText, "audits") ||
    matchesKeyword(rawText, "spreadsheet consolidation") ||
    ((matchesKeyword(rawText, "internal systems") || matchesKeyword(rawText, "six internal systems")) &&
      (matchesKeyword(rawText, "compliance") || matchesKeyword(rawText, "audit")))
  ) {
    return "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.";
  }

  if (
    matchesKeyword(rawText, "compliance reports") ||
    (matchesKeyword(rawText, "manually collected data") && matchesKeyword(rawText, "several systems"))
  ) {
    return "Manual compliance reporting across several systems creates reporting delays and coordination work.";
  }

  if (matchesKeyword(rawText, "visibility gaps") || matchesKeyword(rawText, "missed handoffs")) {
    return "Manual handoffs create missed ownership and visibility gaps.";
  }

  if (
    matchesKeyword(rawText, "approval bottlenecks") ||
    matchesKeyword(rawText, "escalation bottlenecks") ||
    matchesKeyword(rawText, "workflow bottlenecks") ||
    matchesKeyword(rawText, "bottleneck")
  ) {
    return "Manual approvals create bottlenecks and follow-up burden.";
  }

  if (matchesKeyword(rawText, "customer onboarding delays") || matchesKeyword(rawText, "onboarding delays")) {
    return "Manual onboarding handoffs create customer onboarding delays.";
  }

  if (matchesKeyword(rawText, "duplicate work") || matchesKeyword(rawText, "errors")) {
    return "Manual tracking creates duplicate work and error risk.";
  }

  if (matchesKeyword(rawText, "follow-up burden") || matchesKeyword(rawText, "follow up")) {
    return "Manual coordination creates follow-up burden and visibility gaps.";
  }

  return "Unknown";
}

function getUrgency(rawText: string, operationalScore: number) {
  const repetitivePain =
    matchesKeyword(rawText, "repetitive") ||
    matchesKeyword(rawText, "hours") ||
    matchesKeyword(rawText, "waste") ||
    matchesKeyword(rawText, "manually");

  if (operationalScore >= 10 || (operationalScore >= 5 && repetitivePain)) return "high";
  if (operationalScore >= 5 || repetitivePain) return "medium";
  return "low";
}

function shouldSuppressPainSummary(rawText: string, filterMetadata: FilterMetadata) {
  if (filterMetadata.status === "filtered_out" || filterMetadata.confidence === "low") return true;

  const hasOperationalEvidence =
    (filterMetadata.operationalScore ?? 0) > 0 ||
    matchesAnyKeyword(rawText, [
      "manual",
      "manually",
      "spreadsheet",
      "spreadsheets",
      "crm",
      "workflow",
      "handoff",
      "reporting",
      "reconcile",
      "ticket",
      "support",
      "candidate",
      "renewal",
      "forecast",
      "compliance",
    ]);

  return !hasOperationalEvidence;
}

function getMonetizationScore(operationalScore: number, b2bScore: number) {
  return Math.min(10, Math.max(1, Math.round((operationalScore + b2bScore) / 3)));
}

export function mockPainExtractor(
  rawText: string,
  filterMetadata: FilterMetadata = {},
): MockPainExtractionResult {
  const classification = classifyAffectedTeam(rawText);
  const operationalScore = filterMetadata.operationalScore ?? 0;
  const b2bScore = filterMetadata.b2bScore ?? 0;
  const existingWorkaround = getExistingWorkaround(rawText);
  const summaryInput = {
    rawText,
    affectedTeam: classification.team,
    existingWorkaround,
  };
  const pain = shouldSuppressPainSummary(rawText, filterMetadata)
    ? "No meaningful operational pain detected."
    : generatePainSummary(summaryInput);
  const outreachAngle = generateOutreachAngle(summaryInput);

  return {
    pain,
    b2bScore,
    urgency: getUrgency(rawText, operationalScore),
    frequency: getFrequency(rawText),
    affectedTeam: classification.team,
    existingWorkaround,
    currentSolution: getCurrentSolution(rawText),
    solutionGap: getSolutionGap(rawText),
    possibleIcp: getPossibleIcp(classification.team),
    monetizationScore: getMonetizationScore(operationalScore, b2bScore),
    outreachAngle,
    aiModel: "mock-v1",
    promptVersion: "mock-pain-extraction-v1",
    aiOutput: {
      rawText,
      mock: true,
      filterMetadata,
      extractionClassification: classification,
      extractionRules: {
        classifier: "weighted-team-classifier-v1",
      },
    },
  };
}
