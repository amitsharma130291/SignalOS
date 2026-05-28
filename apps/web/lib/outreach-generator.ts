import {
  compactSentence,
  enforceNoGenericPhrases,
  joinSignalNouns,
} from "./pain-summary-generator.ts";

export type OutreachDraftInput = {
  rawText?: string | null;
  pain?: string | null;
  humanPain?: string | null;
  urgency?: string | null;
  affectedTeam?: string | null;
  existingWorkaround?: string | null;
  monetizationScore?: number | null;
  outreachAngle?: string | null;
  humanOutreachAngle?: string | null;
  outreachAngleRefined?: string | null;
  targetTitles?: unknown;
  companySize?: string | null;
  industry?: string | null;
  buyer?: string | null;
  budgetOwner?: string | null;
  triggerEvent?: string | null;
};

export type WorkflowContext = {
  tools: string[];
  workflows: string[];
  objects: string[];
  action: string | null;
};

export type GeneratedOutreachDraft = {
  hook: string;
  problem: string;
  angle: string;
  cta: string;
  email_subjects: string[];
  cold_email: string;
  linkedin_message: string;
  variants: {
    consultative: string;
    direct: string;
    executive: string;
  };
  quality: {
    score: number;
    warnings: string[];
  };
};

export const BANNED_OUTREACH_PHRASES = [
  "manual operational workaround",
  "operational work",
  "operational workaround",
  "workflow friction",
  "streamline operations",
  "improve efficiency",
  "manual processes",
  "handle reduce",
  "workflows becoming manual",
  "operational growth",
  "manage operational processes",
  "generic operational phrasing",
  "improve operations",
  "optimize workflows",
];

const TEAM_FALLBACKS: Record<string, string> = {
  finance: "finance teams",
  support: "support teams",
  "customer success": "customer success teams",
  sales: "sales ops teams",
  recruiting: "recruiting teams",
};

function normalize(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : fallback;
}

function parseTargetTitles(targetTitles: unknown) {
  if (!Array.isArray(targetTitles)) return [];
  return targetTitles.filter((title): title is string => typeof title === "string" && title.trim().length > 0);
}

function includesTerm(value: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(value);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function containsBannedOutreachPhrase(value: string | null | undefined) {
  const normalized = value?.toLowerCase() ?? "";
  return BANNED_OUTREACH_PHRASES.some((phrase) => normalized.includes(phrase));
}

function isUsableSource(value: string | null | undefined) {
  const trimmed = value?.trim();
  return Boolean(trimmed) && !containsBannedOutreachPhrase(trimmed);
}

export function extractWorkflowContext(rawText: string | null | undefined): WorkflowContext {
  const text = rawText ?? "";
  const toolPatterns: Array<[string, string]> = [
    ["stripe", "Stripe"],
    ["netsuite", "NetSuite"],
    ["salesforce", "Salesforce"],
    ["hubspot", "HubSpot"],
    ["slack", "Slack"],
    ["zendesk", "Zendesk"],
    ["airtable", "Airtable"],
    ["jira", "Jira"],
    ["google sheets", "Google Sheets"],
    ["spreadsheet", "spreadsheets"],
    ["spreadsheets", "spreadsheets"],
    ["crm", "CRM"],
  ];
  const workflowPatterns: Array<[string, string]> = [
    ["reconciliation", "reconciliation"],
    ["reconcile", "reconciliation"],
    ["reconciles", "reconciliation"],
    ["reconciled", "reconciliation"],
    ["onboarding", "onboarding"],
    ["reporting", "reporting"],
    ["report", "reporting"],
    ["reports", "reporting"],
    ["approval", "approvals"],
    ["approvals", "approvals"],
    ["handoff", "handoffs"],
    ["handoffs", "handoffs"],
    ["interview scheduling", "interview scheduling"],
    ["invoice processing", "invoice processing"],
    ["crm updates", "CRM updates"],
    ["support queue", "support queue"],
    ["pipeline updates", "pipeline updates"],
  ];
  const objectPatterns: Array<[string, string]> = [
    ["payout", "payouts"],
    ["payouts", "payouts"],
    ["invoice", "invoices"],
    ["invoices", "invoices"],
    ["ticket", "tickets"],
    ["tickets", "tickets"],
    ["report", "reports"],
    ["reports", "reports"],
    ["customer calls", "customer calls"],
    ["candidate", "candidates"],
    ["candidates", "candidates"],
    ["contract", "contracts"],
    ["contracts", "contracts"],
    ["renewal", "renewals"],
    ["renewals", "renewals"],
    ["request", "requests"],
    ["requests", "requests"],
  ];
  const actionPatterns: Array<[string, string]> = [
    ["reconcile", "reconcile"],
    ["reconciles", "reconcile"],
    ["track", "track"],
    ["tracks", "track"],
    ["coordinate", "coordinate"],
    ["coordinates", "coordinate"],
    ["triage", "triage"],
    ["triages", "triage"],
    ["route", "route"],
    ["routes", "route"],
    ["update", "update"],
    ["updates", "update"],
    ["process", "process"],
    ["processes", "process"],
  ];

  return {
    tools: unique(toolPatterns.filter(([term]) => includesTerm(text, term)).map(([, label]) => label)),
    workflows: unique(workflowPatterns.filter(([term]) => includesTerm(text, term)).map(([, label]) => label)),
    objects: unique(objectPatterns.filter(([term]) => includesTerm(text, term)).map(([, label]) => label)),
    action: actionPatterns.find(([term]) => includesTerm(text, term))?.[1] ?? null,
  };
}

function getFallbackSignalText(input: OutreachDraftInput) {
  return [
    input.humanPain,
    input.humanOutreachAngle,
    input.pain,
    input.outreachAngle,
    input.existingWorkaround,
    input.outreachAngleRefined,
    input.triggerEvent,
  ]
    .filter(isUsableSource)
    .join(" ");
}

function getWorkflowContext(input: OutreachDraftInput) {
  const rawContext = extractWorkflowContext(input.rawText);
  if (rawContext.tools.length || rawContext.workflows.length || rawContext.objects.length) {
    return rawContext;
  }

  return extractWorkflowContext(getFallbackSignalText(input));
}

function getTeam(input: OutreachDraftInput) {
  const team = normalize(input.affectedTeam, "operations");
  const teamLower = team.toLowerCase();
  const fallbackKey = Object.keys(TEAM_FALLBACKS).find((key) => teamLower.includes(key));
  return fallbackKey ? TEAM_FALLBACKS[fallbackKey] : `${teamLower} teams`;
}

function getPrimaryTitle(input: OutreachDraftInput) {
  return parseTargetTitles(input.targetTitles)[0] ?? normalize(input.buyer, "operations leaders");
}

function hasFinanceReconciliationSignal(input: OutreachDraftInput) {
  const { tools, workflows } = getWorkflowContext(input);
  const team = normalize(input.affectedTeam, "").toLowerCase();

  return (
    team.includes("finance") &&
    (workflows.includes("reconciliation") || tools.includes("Stripe") || tools.includes("NetSuite"))
  );
}

function hasInternalApprovalsSignal(input: OutreachDraftInput) {
  const { workflows } = getWorkflowContext(input);
  return workflows.includes("approvals");
}

function getWorkflowPhrase(input: OutreachDraftInput) {
  const { tools, workflows, objects } = getWorkflowContext(input);

  if (hasFinanceReconciliationSignal(input)) {
    if (tools.includes("Stripe") && tools.includes("NetSuite")) {
      return "Stripe payouts with NetSuite reconciliation";
    }

    return "finance reconciliation";
  }

  if (tools.includes("CRM") && workflows.includes("reporting")) return "CRM reporting";
  if (workflows.includes("onboarding") && (tools.includes("Slack") || tools.includes("spreadsheets"))) {
    return `onboarding handoffs across ${joinSignalNouns(tools)}`;
  }
  if (workflows.includes("interview scheduling")) return "interview scheduling";
  if (workflows.includes("approvals")) return "internal approvals";

  const nounPhrase = joinSignalNouns([...tools, ...workflows, ...objects]);
  if (nounPhrase) return nounPhrase;

  const refined = isUsableSource(input.outreachAngleRefined) ? normalize(input.outreachAngleRefined, "") : "";
  const angle = isUsableSource(input.humanOutreachAngle)
    ? normalize(input.humanOutreachAngle, "")
    : isUsableSource(input.outreachAngle)
      ? normalize(input.outreachAngle, "")
      : "";
  const pain = isUsableSource(input.humanPain)
    ? normalize(input.humanPain, "")
    : isUsableSource(input.pain)
      ? normalize(input.pain, "")
      : "";
  const fallback = refined || angle || pain || "manual handoffs";

  return sanitizeOutreachText(
    fallback
      .replace(/\b(reduce|reducing|eliminate|automate|streamline)\b/gi, "")
      .replace(/\bmanual\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || "manual handoffs",
  ).toLowerCase();
}

function getWorkaround(input: OutreachDraftInput) {
  const { tools } = getWorkflowContext(input);
  if (tools.includes("spreadsheets") && tools.includes("Slack")) return "spreadsheets and Slack updates";
  if (tools.includes("spreadsheets")) return "spreadsheets";
  if (tools.includes("Google Sheets")) return "Google Sheets";
  return isUsableSource(input.existingWorkaround)
    ? cleanGeneratedCopy(normalize(input.existingWorkaround, "manual handoffs")).toLowerCase()
    : "manual handoffs";
}

function getSubjectBase(input: OutreachDraftInput) {
  const team = normalize(input.affectedTeam, "Ops");
  const workflow = getWorkflowPhrase(input);
  if (hasFinanceReconciliationSignal(input)) return "Reducing Stripe and NetSuite reconciliation work";
  if (hasInternalApprovalsSignal(input)) return "Coordinating internal approvals";
  if (workflow.includes("onboarding")) return "Onboarding coordination";
  if (workflow.includes("crm") || workflow.includes("reporting")) return "CRM reporting handoffs";
  if (team.toLowerCase().includes("support")) return "Support triage workload";
  return `${team} workflow follow-up`;
}

function buildDraftParts(input: OutreachDraftInput) {
  const team = getTeam(input);
  const workflow = getWorkflowPhrase(input);
  const workaround = getWorkaround(input);
  const title = getPrimaryTitle(input);
  const context = getWorkflowContext(input);
  const toolPhrase = joinSignalNouns(context.tools.filter((tool) => tool !== "CRM" && tool !== "spreadsheets"));
  const monetizationScore = input.monetizationScore ?? 0;
  const impact = monetizationScore >= 4 ? "reporting delays and extra cleanup work" : "follow-up and visibility gaps";

  if (hasFinanceReconciliationSignal(input)) {
    return {
      hook: `Noticed finance teams often reconcile Stripe payouts with NetSuite manually through ${getWorkaround(input)}.`,
      problem: "That usually creates reporting delays and extra cleanup work as transaction volume grows.",
      angle: "Teams usually improve finance visibility by reducing spreadsheet cleanup around reconciliation.",
      cta: "Curious if this is something your team is trying to reduce right now?",
    };
  }

  if (hasInternalApprovalsSignal(input)) {
    return {
      hook: "Noticed teams often spend too much time coordinating internal approvals manually.",
      problem: "That usually creates follow-up gaps and delays as requests move between teams.",
      angle: "Teams usually tighten this by making approval status easier to track and resolve.",
      cta: "Curious if this is something your team is trying to tighten up?",
    };
  }

  if (workflow.includes("CRM reporting")) {
    return {
      hook: `Noticed sales teams often coordinate CRM reporting${
        toolPhrase ? ` across ${toolPhrase}` : ""
      } through ${workaround}.`,
      problem: "That usually creates stale reports and extra cleanup work as pipeline volume grows.",
      angle: `Teams usually make CRM updates easier for ${title} to review and trust.`,
      cta: "Worth comparing how your team handles CRM reporting today?",
    };
  }

  if (workflow.includes("onboarding")) {
    return {
      hook: `Noticed customer teams often coordinate ${workflow} through ${workaround}.`,
      problem: "That usually creates handoff gaps and extra follow-up as customer volume grows.",
      angle: `Teams usually make onboarding easier for ${title} to track across teams.`,
      cta: "Worth comparing how your team handles onboarding handoffs today?",
    };
  }

  if (workflow.includes("interview scheduling")) {
    return {
      hook: `Noticed recruiting teams often coordinate interview scheduling through ${workaround}.`,
      problem: "That usually creates candidate delays and extra scheduling follow-up.",
      angle: `Teams usually make interview scheduling easier for ${title} to track and adjust.`,
      cta: "Worth comparing how your team handles interview scheduling today?",
    };
  }

  return {
    hook: `Noticed ${team} often coordinate ${workflow} through ${workaround}.`,
    problem: `That usually creates ${impact} as volume grows.`,
    angle: `Teams usually make this easier for ${title} to review, route, and track.`,
    cta: "Worth comparing how your team currently handles this workflow?",
  };
}

function joinBody(parts: Pick<GeneratedOutreachDraft, "hook" | "problem" | "angle" | "cta">) {
  return sanitizeOutreachText([parts.hook, parts.problem, parts.angle, parts.cta].join("\n\n"));
}

function countWords(value: string) {
  return value.split(/\s+/).filter(Boolean).length;
}

function includesQuestion(value: string) {
  return /\?\s*$/.test(value.trim()) || /\b(worth|open to|does it make sense|would it help)\b/i.test(value);
}

export function cleanGeneratedCopy(text: string) {
  return text
    .replace(/\bcoordinationaround\b/gi, "coordination around")
    .replace(/\bworkflowworkflow\b/gi, "workflow")
    .replace(/\bapprovalapproval\b/gi, "approval")
    .replace(/\bapprovalsapprovals\b/gi, "approvals")
    .replace(/\b([a-z]+)\s+\1\b/gi, "$1")
    .replace(/\s+([,.?])/g, "$1")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

function sanitizeOutreachText(value: string) {
  const replaced = enforceNoGenericPhrases(
    BANNED_OUTREACH_PHRASES.reduce(
      (text, phrase) => text.replace(new RegExp(phrase, "gi"), "manual coordination"),
      value,
    ),
  );

  return replaced
    .split(/\n{2,}/)
    .map((part) =>
      cleanGeneratedCopy(compactSentence(part.replace(/\bhandle\s+reduce\b/gi, "reduce"), 900)),
    )
    .join("\n\n");
}

function getMalformedWarnings(value: string) {
  const warnings: string[] = [];
  if (/\b([a-z]+)\s+\1\b/i.test(value)) {
    warnings.push("Copy contains duplicate adjacent words.");
  }
  if (/\b(coordinationaround|workflowworkflow|approvalapproval|approvalsapprovals)\b/i.test(value)) {
    warnings.push("Copy contains malformed joined words.");
  }
  return warnings;
}

function scoreCopy(input: OutreachDraftInput, copy: string, cta: string) {
  const warnings: string[] = [];
  let score = 60;
  const normalizedCopy = copy.toLowerCase();
  const workflow = getWorkflowPhrase(input).toLowerCase();
  const titles = parseTargetTitles(input.targetTitles);
  const context = getWorkflowContext(input);

  if (includesQuestion(cta)) score += 10;
  else warnings.push("Missing a clear CTA.");

  if (
    context.tools.some((tool) => normalizedCopy.includes(tool.toLowerCase())) ||
    context.workflows.some((workflowName) => normalizedCopy.includes(workflowName.toLowerCase())) ||
    (workflow !== "the workflow" && normalizedCopy.includes(workflow.split(" ").slice(0, 3).join(" ")))
  ) {
    score += 10;
  } else {
    warnings.push("Workflow reference may be too vague.");
  }

  if (titles.some((title) => normalizedCopy.includes(title.toLowerCase())) || normalizedCopy.includes(getTeam(input))) {
    score += 10;
  } else {
    warnings.push("Could use a clearer buyer or team reference.");
  }

  if (countWords(copy) > 130) warnings.push("Cold email is too long for first-touch outreach.");
  else score += 5;

  if (BANNED_OUTREACH_PHRASES.some((phrase) => normalizedCopy.includes(phrase))) {
    warnings.push("Copy uses generic operational phrasing.");
    score = Math.min(score - 15, 40);
  }

  const malformedWarnings = getMalformedWarnings(copy);
  if (malformedWarnings.length) {
    warnings.push(...malformedWarnings);
    score = Math.min(score - 35, 40);
  }

  if (/(\bworkflow\b.*){4,}/i.test(copy)) {
    warnings.push("Copy repeats workflow language too often.");
    score -= 10;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    warnings,
  };
}

export function evaluateOutreachQuality(
  input: OutreachDraftInput,
  copy: string,
  cta = "Worth comparing how your team currently handles this workflow?",
) {
  return scoreCopy(input, copy, cta);
}

export function generateOutreachDraft(input: OutreachDraftInput): GeneratedOutreachDraft {
  const parts = buildDraftParts(input);
  const subjectBase = sanitizeOutreachText(getSubjectBase(input));
  const coldEmail = joinBody(parts);
  const linkedinMessage = sanitizeOutreachText(`${parts.hook} ${parts.problem} ${parts.cta}`);
  const title = getPrimaryTitle(input);
  const workflow = getWorkflowPhrase(input);
  const quality = scoreCopy(input, coldEmail, parts.cta);

  return {
    hook: sanitizeOutreachText(parts.hook),
    problem: sanitizeOutreachText(parts.problem),
    angle: sanitizeOutreachText(parts.angle),
    cta: sanitizeOutreachText(parts.cta),
    email_subjects: [
      subjectBase,
      sanitizeOutreachText(`${title} and ${workflow}`),
      "Quick workflow question",
    ],
    cold_email: coldEmail,
    linkedin_message: linkedinMessage,
    variants: {
      consultative: sanitizeOutreachText(
        `${parts.hook}\n\nCurious whether this is already creating extra review work for ${title}.\n\n${parts.cta}`,
      ),
      direct: sanitizeOutreachText(`${parts.problem}\n\n${parts.angle}\n\n${parts.cta}`),
      executive: sanitizeOutreachText(
        `${parts.hook}\n\nAt scale, that can affect visibility, response time, and operating cost.\n\n${parts.cta}`,
      ),
    },
    quality,
  };
}
