type FilterMetadata = {
  operationalScore?: number;
  b2bScore?: number;
  marketType?: string;
  matchedPositiveKeywords?: string[];
  matchedB2BKeywords?: string[];
};

export type MockPainExtractionResult = {
  pain: string;
  b2bScore: number;
  urgency: string;
  affectedTeam: string;
  existingWorkaround: string;
  possibleIcp: string;
  monetizationScore: number;
  outreachAngle: string;
  aiModel: "mock-v1";
  promptVersion: "mock-pain-extraction-v1";
  aiOutput: Record<string, unknown>;
};

const TEAM_RULES = [
  {
    keywords: ["sales reps", "sales ops", "revops", "crm", "sales team"],
    affectedTeam: "Sales Ops",
    possibleIcp: "Sales Ops and RevOps teams at B2B companies",
  },
  {
    keywords: ["support", "support team", "customer support", "ticket"],
    affectedTeam: "Support",
    possibleIcp: "Support and customer success teams at B2B companies",
  },
  {
    keywords: ["onboarding", "customer success"],
    affectedTeam: "Customer Success",
    possibleIcp: "Customer success and onboarding teams at B2B SaaS companies",
  },
  {
    keywords: ["finance ops", "finance", "approval", "procurement"],
    affectedTeam: "Finance Ops",
    possibleIcp: "Finance and procurement teams at B2B companies",
  },
] as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeyword(rawText: string, keyword: string) {
  // Keep mock extraction aligned with filter matching: whole-word regex only,
  // so words like "updating" never accidentally match unrelated keywords.
  return new RegExp(`\\b${escapeRegex(keyword)}\\b`, "i").test(rawText);
}

function getMatchedKeywords(rawText: string, keywords: readonly string[]) {
  return keywords.filter((keyword) => matchesKeyword(rawText, keyword));
}

function pickTeam(rawText: string) {
  return (
    TEAM_RULES.find((rule) => rule.keywords.some((keyword) => matchesKeyword(rawText, keyword))) ?? {
      affectedTeam: "Operations",
      possibleIcp: "Operations teams at B2B companies",
    }
  );
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

function getMonetizationScore(operationalScore: number, b2bScore: number) {
  return Math.min(10, Math.max(1, Math.round((operationalScore + b2bScore) / 3)));
}

function buildPain(rawText: string, affectedTeam: string, existingWorkaround: string) {
  if (
    affectedTeam === "Sales Ops" &&
    matchesKeyword(rawText, "spreadsheet") &&
    matchesKeyword(rawText, "crm") &&
    matchesKeyword(rawText, "reporting")
  ) {
    return "Sales ops team relies on manual spreadsheet and CRM workflows for reporting handoffs.";
  }

  if (
    affectedTeam === "Sales Ops" &&
    matchesKeyword(rawText, "sales reps") &&
    matchesKeyword(rawText, "crm")
  ) {
    return "Sales reps lose time manually updating CRM fields after customer calls.";
  }

  if (matchesKeyword(rawText, "support")) {
    return `${affectedTeam} team has operational friction around support workflows.`;
  }

  if (matchesKeyword(rawText, "onboarding")) {
    return `${affectedTeam} team has friction in onboarding workflows.`;
  }

  return `${affectedTeam} team relies on ${existingWorkaround.toLowerCase()} to manage operational work.`;
}

function buildOutreachAngle(affectedTeam: string, rawText: string) {
  if (affectedTeam === "Sales Ops" && matchesKeyword(rawText, "reporting")) {
    return "Reduce manual reporting handoffs for sales operations teams.";
  }

  if (
    affectedTeam === "Sales Ops" &&
    matchesKeyword(rawText, "sales reps") &&
    matchesKeyword(rawText, "crm")
  ) {
    return "Reduce manual CRM updates for sales reps after customer calls.";
  }

  if (matchesKeyword(rawText, "support")) {
    return "Reduce repetitive support operations work for frontline teams.";
  }

  if (matchesKeyword(rawText, "onboarding")) {
    return "Streamline onboarding workflows and reduce manual coordination.";
  }

  return `Reduce manual operational work for ${affectedTeam.toLowerCase()} teams.`;
}

export function mockPainExtractor(
  rawText: string,
  filterMetadata: FilterMetadata = {},
): MockPainExtractionResult {
  const team = pickTeam(rawText);
  const operationalScore = filterMetadata.operationalScore ?? 0;
  const b2bScore = filterMetadata.b2bScore ?? 0;
  const existingWorkaround = getExistingWorkaround(rawText);
  const pain = buildPain(rawText, team.affectedTeam, existingWorkaround);
  const outreachAngle = buildOutreachAngle(team.affectedTeam, rawText);

  return {
    pain,
    b2bScore,
    urgency: getUrgency(rawText, operationalScore),
    affectedTeam: team.affectedTeam,
    existingWorkaround,
    possibleIcp: team.possibleIcp,
    monetizationScore: getMonetizationScore(operationalScore, b2bScore),
    outreachAngle,
    aiModel: "mock-v1",
    promptVersion: "mock-pain-extraction-v1",
    aiOutput: {
      rawText,
      mock: true,
      filterMetadata,
      extractionRules: {
        teamKeywords: TEAM_RULES.map((rule) => ({
          affectedTeam: rule.affectedTeam,
          keywords: rule.keywords,
        })),
      },
    },
  };
}
