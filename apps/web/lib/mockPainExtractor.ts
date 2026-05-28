import { classifyAffectedTeam } from "./extraction-classifier.ts";
import { matchesKeyword } from "./filterRawInput.ts";
import { generateOutreachAngle } from "./outreach-angle-generator.ts";
import { generatePainSummary } from "./pain-summary-generator.ts";

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

const POSSIBLE_ICP_BY_TEAM: Record<string, string> = {
  "Sales Ops": "Sales Ops and RevOps teams at B2B companies",
  Support: "Support and customer support operations teams at B2B companies",
  "Customer Success": "Customer success and onboarding teams at B2B SaaS companies",
  "Finance Ops": "Finance and procurement teams at B2B companies",
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
  const pain = generatePainSummary(summaryInput);
  const outreachAngle = generateOutreachAngle(summaryInput);

  return {
    pain,
    b2bScore,
    urgency: getUrgency(rawText, operationalScore),
    affectedTeam: classification.team,
    existingWorkaround,
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
