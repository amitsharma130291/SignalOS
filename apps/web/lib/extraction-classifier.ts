import { matchesKeyword } from "./filterRawInput.ts";

export type ExtractionClassification = {
  team: string;
  confidence: number;
  matchedKeywords: string[];
  reasoning: string[];
};

type TeamRule = {
  team: string;
  keywords: Record<string, number>;
};

const TEAM_RULES: TeamRule[] = [
  {
    team: "Finance Ops",
    keywords: {
      netsuite: 6,
      stripe: 6,
      reconciliation: 6,
      reconcile: 6,
      reconciles: 6,
      reconciled: 6,
      reconciling: 6,
      invoice: 5,
      invoices: 5,
      erp: 5,
      accounting: 5,
      "finance operations": 5,
      "finance ops": 5,
      procurement: 4,
      approval: 3,
      approvals: 3,
      finance: 3,
    },
  },
  {
    team: "Sales Ops",
    keywords: {
      "sales ops": 6,
      revops: 6,
      crm: 5,
      "crm fields": 5,
      pipeline: 5,
      "sales reps": 4,
      "sales team": 4,
      forecasting: 4,
      "revenue operations": 4,
      reporting: 2,
    },
  },
  {
    team: "Support",
    keywords: {
      zendesk: 6,
      "support queue": 6,
      ticket: 5,
      tickets: 5,
      "support ops": 5,
      "support team": 4,
      "customer support": 4,
      support: 3,
      triage: 3,
    },
  },
  {
    team: "Customer Success",
    keywords: {
      onboarding: 6,
      "customer success": 6,
      "cs ops": 5,
      renewal: 4,
      retention: 4,
      implementation: 3,
      "customer handoff": 3,
    },
  },
  {
    team: "Operations",
    keywords: {
      operations: 2,
      workflow: 2,
      workflows: 2,
      handoff: 2,
      handoffs: 2,
      manually: 1,
      manual: 1,
      spreadsheet: 1,
      spreadsheets: 1,
    },
  },
];

function scoreRule(rawText: string, rule: TeamRule) {
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const [keyword, weight] of Object.entries(rule.keywords).sort(
    ([left], [right]) => right.length - left.length,
  )) {
    if (matchesKeyword(rawText, keyword)) {
      matchedKeywords.push(keyword);
      score += weight;
    }
  }

  return { team: rule.team, matchedKeywords, score };
}

function resolveConfidence(topScore: number, margin: number) {
  if (topScore >= 10 && margin >= 3) return 0.9;
  if (topScore >= 6 && margin >= 2) return 0.75;
  if (topScore >= 4) return 0.6;
  return 0.35;
}

export function classifyAffectedTeam(rawText: string): ExtractionClassification {
  const scores = TEAM_RULES.map((rule) => scoreRule(rawText, rule)).sort(
    (left, right) => right.score - left.score,
  );
  const [topScore, secondScore] = scores;

  if (!topScore || topScore.score < 4) {
    return {
      team: "Operations",
      confidence: 0.35,
      matchedKeywords: topScore?.matchedKeywords ?? [],
      reasoning: ["Operations selected because no team-specific keywords had enough evidence."],
    };
  }

  const margin = topScore.score - (secondScore?.score ?? 0);
  const confidence = resolveConfidence(topScore.score, margin);

  if (confidence < 0.55) {
    return {
      team: "Operations",
      confidence,
      matchedKeywords: topScore.matchedKeywords,
      reasoning: [
        `Operations selected because ${topScore.team} evidence was too weak to route confidently.`,
      ],
    };
  }

  const comparison =
    secondScore && secondScore.score > 0
      ? `${topScore.team} selected because ${topScore.score} points outweighed ${secondScore.team} at ${secondScore.score} points.`
      : `${topScore.team} selected because matched keywords reached ${topScore.score} points.`;

  return {
    team: topScore.team,
    confidence,
    matchedKeywords: topScore.matchedKeywords,
    reasoning: [
      comparison,
      `Matched keywords: ${topScore.matchedKeywords.join(", ") || "none"}.`,
    ],
  };
}
