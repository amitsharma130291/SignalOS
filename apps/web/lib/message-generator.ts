export type MessageDraftInput = {
  pain?: string | null;
  urgency?: string | null;
  affectedTeam?: string | null;
  existingWorkaround?: string | null;
  possibleIcp?: string | null;
  outreachAngle?: string | null;
  targetTitles?: unknown;
  industry?: string | null;
  triggerEvent?: string | null;
};

export type GeneratedOutboundDraft = {
  subject: string;
  body: string;
  structure: {
    observation: string;
    pain_relevance: string;
    curiosity: string;
    question: string;
  };
};

const BANNED_PHRASES = ["10x", "revolutionary", "game changer", "guaranteed", "limited time"];

function normalize(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.toLowerCase() !== "unknown" ? trimmed : fallback;
}

function parseTargetTitles(targetTitles: unknown) {
  if (!Array.isArray(targetTitles)) return [];
  return targetTitles.filter((title): title is string => typeof title === "string");
}

function getTeam(input: MessageDraftInput) {
  return normalize(input.affectedTeam, "operations");
}

function getPrimaryTitle(input: MessageDraftInput) {
  return parseTargetTitles(input.targetTitles)[0] ?? "operations leaders";
}

function getSubject(input: MessageDraftInput) {
  const team = getTeam(input).toLowerCase();
  const pain = normalize(input.pain, "").toLowerCase();

  if (team.includes("finance")) return "Reducing reconciliation work for finance ops";
  if (team.includes("customer success") || pain.includes("onboarding")) {
    return "Streamlining onboarding coordination";
  }
  if (team.includes("support")) return "Reducing repetitive support work";
  if (team.includes("sales") && (pain.includes("crm") || pain.includes("reporting"))) {
    return "CRM reporting handoffs";
  }

  return "Reducing manual operations work";
}

function buildStructure(input: MessageDraftInput) {
  const team = getTeam(input);
  const teamLower = team.toLowerCase();
  const workaround = normalize(input.existingWorkaround, "manual workflow steps");
  const pain = normalize(input.pain, "manual operational work");
  const trigger = normalize(input.triggerEvent, "process growth creating extra coordination");
  const title = getPrimaryTitle(input);

  return {
    observation: `Noticed ${teamLower} teams often rely on ${workaround.toLowerCase()} as work scales.`,
    pain_relevance: `That can turn ${pain.toLowerCase()} into extra follow-up, reporting, and coordination work.`,
    curiosity: `Curious if this is already showing up for ${title} in ${normalize(
      input.industry,
      "B2B",
    )}, especially around ${trigger.toLowerCase()}.`,
    question: "Worth comparing notes on how your team is handling this today?",
  };
}

function sanitizeDraft(value: string) {
  return BANNED_PHRASES.reduce(
    (text, phrase) => text.replace(new RegExp(phrase, "gi"), ""),
    value,
  )
    .replace(/!+/g, ".")
    .replace(/\?{2,}/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function enforceWordLimit(body: string, maxWords = 120) {
  const words = body.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return body;
  return `${words.slice(0, maxWords).join(" ")}.`;
}

export function generateOutboundDraft(input: MessageDraftInput): GeneratedOutboundDraft {
  const structure = buildStructure(input);
  const body = enforceWordLimit(
    sanitizeDraft(
      [
        structure.observation,
        structure.pain_relevance,
        structure.curiosity,
        structure.question,
      ].join("\n\n"),
    ),
  );

  return {
    subject: sanitizeDraft(getSubject(input)),
    body,
    structure,
  };
}

export function containsBannedPhrase(value: string) {
  return BANNED_PHRASES.some((phrase) => value.toLowerCase().includes(phrase));
}
