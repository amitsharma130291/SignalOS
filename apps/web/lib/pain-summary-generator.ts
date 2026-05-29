import { matchesKeyword } from "./filterRawInput.ts";

export type PainSummaryInput = {
  rawText: string;
  affectedTeam: string;
  existingWorkaround: string;
};

export const BANNED_GENERIC_PHRASES = [
  "operational work",
  "operational workaround",
  "operational friction",
  "workflow friction",
  "workflow management",
  "operational process",
  "repetitive operational tasks",
  "manage operations",
  "operational inefficiencies",
  "manage operational work",
  "improve operational workflows",
];

const TOOL_PATTERNS: Record<string, string> = {
  stripe: "Stripe",
  netsuite: "NetSuite",
  excel: "Excel",
  "google sheets": "Google Sheets",
  salesforce: "Salesforce",
  hubspot: "HubSpot",
  slack: "Slack",
  crm: "CRM",
  spreadsheet: "spreadsheets",
  spreadsheets: "spreadsheets",
  zendesk: "Zendesk",
  airtable: "Airtable",
};

const WORKFLOW_PATTERNS: Record<string, string> = {
  onboarding: "onboarding",
  reporting: "reporting",
  reconciliation: "reconciliation",
  reconcile: "reconciliation",
  "interview scheduling": "interview scheduling",
  "crm updates": "CRM updates",
  approval: "approvals",
  approvals: "approvals",
  handoff: "handoffs",
  handoffs: "handoffs",
  invoice: "invoices",
  "invoice processing": "invoice processing",
  invoices: "invoices",
  procurement: "procurement",
  pipeline: "pipeline",
  dashboard: "dashboards",
  dashboards: "dashboards",
  "support queue": "support queue",
  ticket: "tickets",
  tickets: "tickets",
};

export function getMentionedTools(rawText: string) {
  const tools = Object.entries(TOOL_PATTERNS)
    .filter(([keyword]) => matchesKeyword(rawText, keyword))
    .map(([, label]) => label);

  return Array.from(new Set(tools));
}

export function getWorkflowNouns(rawText: string) {
  const nouns = Object.entries(WORKFLOW_PATTERNS)
    .filter(([keyword]) => matchesKeyword(rawText, keyword))
    .map(([, label]) => label);

  return Array.from(new Set(nouns));
}

export function joinSignalNouns(values: string[]) {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  if (uniqueValues.length <= 1) return uniqueValues[0] ?? "";
  if (uniqueValues.length === 2) return `${uniqueValues[0]} and ${uniqueValues[1]}`;
  return `${uniqueValues.slice(0, -1).join(", ")}, and ${uniqueValues[uniqueValues.length - 1]}`;
}

export function compactSentence(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}.`;
}

function hasBannedGenericPhrase(value: string) {
  const normalized = value.toLowerCase();
  return BANNED_GENERIC_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function containsGenericPainPhrase(value: string) {
  return hasBannedGenericPhrase(value);
}

export function enforceNoGenericPhrases(value: string) {
  if (!hasBannedGenericPhrase(value)) return value;
  const sanitized = BANNED_GENERIC_PHRASES.reduce(
    (text, phrase) => text.replace(new RegExp(phrase, "gi"), "manual coordination"),
    value,
  );

  return sanitized.replace(/\s+/g, " ").trim();
}

function getActor(rawText: string, affectedTeam: string) {
  if (matchesKeyword(rawText, "finance coordinators")) return "Finance coordinators";
  if (matchesKeyword(rawText, "recruiting coordinators")) return "Recruiting coordinators";
  if (matchesKeyword(rawText, "customer onboarding")) return "Customer onboarding";
  if (affectedTeam === "Finance Ops") return "Finance Ops";
  if (affectedTeam === "Sales Ops") return "Sales Ops teams";
  if (affectedTeam === "Customer Success") return "Customer Success teams";
  if (affectedTeam === "Support") return "Support teams";
  return "Teams";
}

function finishSummary(summary: string) {
  return compactSentence(enforceNoGenericPhrases(summary));
}

export function generatePainSummary({
  rawText,
  affectedTeam,
  existingWorkaround,
}: PainSummaryInput) {
  const tools = getMentionedTools(rawText);
  const workflows = getWorkflowNouns(rawText);
  const toolPhrase = joinSignalNouns(tools);
  const actor = getActor(rawText, affectedTeam);

  if (
    (affectedTeam === "Finance Ops" || matchesKeyword(rawText, "finance")) &&
    (workflows.includes("reconciliation") || tools.includes("Stripe") || tools.includes("NetSuite"))
  ) {
    if (tools.includes("Stripe") && tools.includes("NetSuite") && tools.includes("spreadsheets")) {
      return finishSummary(
        actor === "Finance Ops"
          ? "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets."
          : `${actor} reconcile Stripe payouts with NetSuite manually through spreadsheets.`,
      );
    }

    return finishSummary(
      actor === "Finance Ops"
        ? `Finance Ops manually reconciles payouts and accounting records${
            toolPhrase ? ` across ${toolPhrase}` : ""
          }.`
        : `${actor} reconcile payouts and accounting records${
            toolPhrase ? ` across ${toolPhrase}` : ""
          }.`,
    );
  }

  if (matchesKeyword(rawText, "recruiting") || matchesKeyword(rawText, "interview scheduling")) {
    return finishSummary(
      `Recruiting coordinators track interview scheduling manually${
        toolPhrase ? ` across ${toolPhrase}` : ""
      }.`,
    );
  }

  if (
    affectedTeam === "Customer Success" ||
    matchesKeyword(rawText, "onboarding") ||
    workflows.includes("handoffs")
  ) {
    return finishSummary(
      `Customer onboarding relies on ${tools.includes("spreadsheets") ? "spreadsheet tracking" : "manual tracking"}${
        tools.includes("Slack") ? " and Slack handoffs" : workflows.includes("handoffs") ? " and handoffs" : ""
      } across teams.`,
    );
  }

  if (affectedTeam === "Sales Ops" && (tools.includes("CRM") || workflows.includes("reporting"))) {
    return finishSummary(
      `Sales Ops teams track CRM reporting updates${
        toolPhrase ? ` across ${toolPhrase}` : ""
      }.`,
    );
  }

  if (affectedTeam === "Sales Ops" && workflows.includes("CRM updates")) {
    return finishSummary(
      `Sales Ops teams update CRM fields${toolPhrase ? ` across ${toolPhrase}` : ""}.`,
    );
  }

  if (workflows.includes("approvals") || workflows.includes("procurement")) {
    return finishSummary(
      `Teams coordinate ${workflows.includes("procurement") ? "procurement approvals" : "approvals"} manually${
        toolPhrase ? ` across ${toolPhrase}` : ""
      }.`,
    );
  }

  if (affectedTeam === "Support") {
    return finishSummary(
      `Support teams triage ${workflows.includes("support queue") ? "support queue" : "customer requests"}${
        toolPhrase ? ` across ${toolPhrase}` : ""
      }.`,
    );
  }

  const nounPhrase = joinSignalNouns([...workflows, ...tools]);
  if (nounPhrase) {
    return finishSummary(`${actor} coordinate ${nounPhrase} manually.`);
  }

  return finishSummary(
    `Teams coordinate ${existingWorkaround.toLowerCase().replace("manual ", "")} manually.`,
  );
}
