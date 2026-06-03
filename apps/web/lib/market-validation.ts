export type MarketValidationSource =
  | "reddit"
  | "g2"
  | "capterra"
  | "hackernews"
  | "forum"
  | "unknown";

export type MarketValidationSearchResult = {
  title: string;
  snippet: string;
  url: string;
  source: MarketValidationSource;
};

export type MarketValidationSignal = "Strong" | "Moderate" | "Weak";

export type MarketValidationEvidenceSource = {
  source: string;
  title: string;
  identifier: string;
  url?: string;
  excerpt?: string;
  confidence?: number;
};

export type MarketValidation = {
  evidenceScore: number;
  marketSignal: MarketValidationSignal;
  complaintCount: number;
  sourceBreakdown: {
    reddit: number;
    g2: number;
    capterra: number;
    hackernews: number;
    forums: number;
  };
  topThemes: string[];
  painExamples: string[];
  sourceUrls: string[];
  evidenceSources: MarketValidationEvidenceSource[];
};

export type MarketValidationInput = {
  rawText?: string | null;
  pain?: string | null;
  solutionGap?: string | null;
  currentSolution?: string | null;
  affectedTeam?: string | null;
  opportunityThesis?: {
    problem?: string;
    problemSummary?: string;
    businessImpact?: string;
    whyCurrentSolutionFails?: string;
  } | null;
};

export interface MarketValidationProvider {
  searchCommunityEvidence(queries: string[]): Promise<MarketValidationSearchResult[]>;
}

type MarketValidationKind =
  | "finance"
  | "sales_ops"
  | "customer_success"
  | "support"
  | "operations"
  | "general";

type ScoreMarketEvidenceInput = Pick<
  MarketValidation,
  "sourceBreakdown" | "topThemes" | "complaintCount"
>;

const EMPTY_SOURCE_BREAKDOWN: MarketValidation["sourceBreakdown"] = {
  reddit: 0,
  g2: 0,
  capterra: 0,
  hackernews: 0,
  forums: 0,
};

const MOCK_RESULTS_BY_KIND: Record<MarketValidationKind, MarketValidationSearchResult[]> = {
  finance: [
    {
      title: "Stripe and NetSuite payout reconciliation",
      snippet: "Finance teams report payout mismatches across Stripe and NetSuite.",
      url: "mock://reddit/finance-stripe-netsuite-reconciliation",
      source: "reddit",
    },
    {
      title: "Month-end close spreadsheet reconciliation",
      snippet: "Month-end close is delayed by manual spreadsheet reconciliation.",
      url: "mock://g2/finance-month-end-close-spreadsheets",
      source: "g2",
    },
    {
      title: "Payout mismatch workflow",
      snippet: "Payout exceptions require manual cleanup before finance can finish reporting.",
      url: "mock://forum/finance-payout-mismatch-cleanup",
      source: "forum",
    },
    {
      title: "Finance reconciliation review",
      snippet: "Teams compare payment processor exports with ledger entries to find reconciliation mismatches.",
      url: "mock://capterra/finance-ledger-reconciliation",
      source: "capterra",
    },
    {
      title: "Spreadsheet close operations",
      snippet: "Spreadsheet tracking creates reporting delays when close tasks move across owners.",
      url: "mock://hackernews/finance-close-spreadsheet-tracking",
      source: "hackernews",
    },
    {
      title: "Finance payout exception thread",
      snippet: "Finance operators describe manual payout reconciliation as the recurring close bottleneck.",
      url: "mock://reddit/finance-payout-exception-thread",
      source: "reddit",
    },
  ],
  sales_ops: [
    {
      title: "Sales forecast spreadsheet reconciliation",
      snippet: "Sales teams reconcile forecast spreadsheets after Salesforce and HubSpot disagree.",
      url: "mock://reddit/sales-forecast-spreadsheet-reconciliation",
      source: "reddit",
    },
    {
      title: "CRM forecast mismatch",
      snippet: "Forecast accuracy drops when CRM fields need manual cleanup before pipeline review.",
      url: "mock://g2/sales-crm-forecast-mismatch",
      source: "g2",
    },
    {
      title: "RevOps data cleanup",
      snippet: "RevOps teams spend hours cleaning pipeline data across sales systems.",
      url: "mock://forum/revops-pipeline-data-cleanup",
      source: "forum",
    },
    {
      title: "Forecast governance",
      snippet: "Manual cleanup is required when sales stages differ across HubSpot and Salesforce.",
      url: "mock://capterra/sales-forecast-governance",
      source: "capterra",
    },
    {
      title: "Fragmented GTM systems",
      snippet: "Fragmented systems make weekly forecast calls depend on spreadsheet tracking.",
      url: "mock://hackernews/sales-forecast-fragmented-systems",
      source: "hackernews",
    },
    {
      title: "Forecast spreadsheet review",
      snippet: "Sales managers describe forecast review as a cleanup exercise across CRM exports.",
      url: "mock://g2/sales-forecast-spreadsheet-review",
      source: "g2",
    },
  ],
  customer_success: [
    {
      title: "Renewal tracking spreadsheet",
      snippet: "Customer Success teams track renewals in spreadsheets because Salesforce context is incomplete.",
      url: "mock://reddit/cs-renewal-spreadsheet-tracking",
      source: "reddit",
    },
    {
      title: "Customer health visibility",
      snippet: "Renewal visibility suffers when customer health data sits across Slack and Salesforce.",
      url: "mock://g2/cs-customer-health-visibility",
      source: "g2",
    },
    {
      title: "CS renewal risk review",
      snippet: "Teams miss renewal risk signals when account notes and health scores live in fragmented systems.",
      url: "mock://forum/cs-renewal-risk-fragmented-systems",
      source: "forum",
    },
    {
      title: "Health score spreadsheet",
      snippet: "Spreadsheet tracking becomes the backup process for customer health reviews.",
      url: "mock://capterra/cs-health-score-spreadsheet",
      source: "capterra",
    },
    {
      title: "Slack renewal context",
      snippet: "Renewal handoffs break when Slack context is not connected to CRM account records.",
      url: "mock://hackernews/cs-slack-renewal-context",
      source: "hackernews",
    },
    {
      title: "Renewal risk spreadsheet backup",
      snippet: "Customer Success teams use spreadsheet trackers when renewal health views are incomplete.",
      url: "mock://forum/cs-renewal-risk-spreadsheet-backup",
      source: "forum",
    },
  ],
  support: [
    {
      title: "Zendesk escalation ownership",
      snippet: "Support teams use spreadsheets to track Zendesk escalation ownership.",
      url: "mock://reddit/support-zendesk-escalation-ownership",
      source: "reddit",
    },
    {
      title: "Missed urgent tickets",
      snippet: "Urgent tickets get missed when escalation ownership is unclear across Slack and Zendesk.",
      url: "mock://g2/support-missed-urgent-tickets",
      source: "g2",
    },
    {
      title: "Support operations escalation tracking",
      snippet: "Support operations teams manually follow up on escalations because spreadsheet tracking drifts.",
      url: "mock://forum/support-escalation-spreadsheet-tracking",
      source: "forum",
    },
    {
      title: "Escalation handoff gaps",
      snippet: "Escalation handoffs break when ticket owners change outside the support system.",
      url: "mock://capterra/support-escalation-handoff-gaps",
      source: "capterra",
    },
    {
      title: "Support queue ownership",
      snippet: "Fragmented systems make it hard to see who owns the next escalation action.",
      url: "mock://hackernews/support-queue-ownership",
      source: "hackernews",
    },
  ],
  operations: [
    {
      title: "Audit prep spreadsheet evidence",
      snippet: "Operations teams collect audit evidence in spreadsheets before compliance reviews.",
      url: "mock://reddit/operations-audit-prep-spreadsheets",
      source: "reddit",
    },
    {
      title: "Manual compliance reporting",
      snippet: "Manual compliance reporting requires evidence collection across internal systems.",
      url: "mock://g2/operations-manual-compliance-reporting",
      source: "g2",
    },
    {
      title: "Audit evidence collection",
      snippet: "Audit preparation slows down when owners update evidence in separate spreadsheets.",
      url: "mock://forum/operations-audit-evidence-collection",
      source: "forum",
    },
    {
      title: "Compliance workflow status",
      snippet: "Spreadsheet tracking makes compliance status hard to reconcile before audit deadlines.",
      url: "mock://capterra/operations-compliance-status",
      source: "capterra",
    },
    {
      title: "Internal systems audit trail",
      snippet: "Fragmented systems create manual cleanup for audit trails and evidence requests.",
      url: "mock://hackernews/operations-audit-trail-cleanup",
      source: "hackernews",
    },
  ],
  general: [
    {
      title: "Manual workflow tracking",
      snippet: "Teams use spreadsheets to track manual workflow status across internal systems.",
      url: "mock://forum/general-manual-workflow-tracking",
      source: "forum",
    },
    {
      title: "Operational follow-up gaps",
      snippet: "Manual status tracking creates follow-up gaps when ownership changes.",
      url: "mock://reddit/general-follow-up-gaps",
      source: "reddit",
    },
    {
      title: "Fragmented systems cleanup",
      snippet: "Fragmented systems create manual cleanup before teams can trust workflow status.",
      url: "mock://g2/general-fragmented-systems-cleanup",
      source: "g2",
    },
  ],
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function getCombinedText(input: MarketValidationInput) {
  return [
    input.rawText,
    input.pain,
    input.solutionGap,
    input.currentSolution,
    input.affectedTeam,
    input.opportunityThesis?.problem,
    input.opportunityThesis?.problemSummary,
    input.opportunityThesis?.businessImpact,
    input.opportunityThesis?.whyCurrentSolutionFails,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
}

function getMarketValidationKind(input: MarketValidationInput): MarketValidationKind {
  const text = getCombinedText(input);

  if (
    text.includes("finance") ||
    text.includes("stripe") ||
    text.includes("netsuite") ||
    text.includes("month-end") ||
    text.includes("month end") ||
    text.includes("payout") ||
    text.includes("reconciliation")
  ) {
    return "finance";
  }
  if (
    text.includes("customer success") ||
    text.includes("renewal") ||
    text.includes("customer health")
  ) {
    return "customer_success";
  }
  if (
    text.includes("sales ops") ||
    text.includes("sales operations") ||
    text.includes("forecast") ||
    text.includes("hubspot") ||
    text.includes("salesforce")
  ) {
    return "sales_ops";
  }
  if (text.includes("support") || text.includes("zendesk") || text.includes("escalation")) {
    return "support";
  }
  if (text.includes("operations") || text.includes("audit") || text.includes("compliance")) {
    return "operations";
  }

  return "general";
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function generateCanonicalPainQueries(input: MarketValidationInput): string[] {
  const kind = getMarketValidationKind(input);

  if (kind === "finance") {
    return [
      "stripe netsuite reconciliation spreadsheet",
      "month end close manual reconciliation",
      "finance operations payout reconciliation",
    ];
  }
  if (kind === "sales_ops") {
    return [
      "sales forecast spreadsheet reconciliation",
      "hubspot salesforce forecast mismatch",
      "revops forecast data cleanup",
    ];
  }
  if (kind === "customer_success") {
    return [
      "renewal spreadsheet salesforce slack",
      "customer success renewal visibility gaps",
      "customer health data spreadsheet",
    ];
  }
  if (kind === "support") {
    return [
      "zendesk escalation spreadsheet ownership",
      "support escalation ownership unclear",
      "missed escalations support operations",
    ];
  }
  if (kind === "operations") {
    return [
      "compliance reporting spreadsheet audit prep",
      "audit evidence collection spreadsheets",
      "manual compliance reporting internal systems",
    ];
  }

  return [
    "manual workflow spreadsheet tracking",
    "operational follow up gaps internal systems",
    "manual status tracking business operations",
  ];
}

function getKindFromQueries(queries: string[]): MarketValidationKind {
  const text = queries.map(normalize).join(" ");

  if (text.includes("stripe") || text.includes("netsuite") || text.includes("payout")) {
    return "finance";
  }
  if (text.includes("forecast") || text.includes("revops") || text.includes("hubspot")) {
    return "sales_ops";
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    return "customer_success";
  }
  if (text.includes("zendesk") || text.includes("escalation")) {
    return "support";
  }
  if (text.includes("compliance") || text.includes("audit")) {
    return "operations";
  }

  return "general";
}

export class MockMarketValidationProvider implements MarketValidationProvider {
  searchCommunityEvidenceSync(queries: string[]): MarketValidationSearchResult[] {
    return [...MOCK_RESULTS_BY_KIND[getKindFromQueries(queries)]];
  }

  async searchCommunityEvidence(queries: string[]): Promise<MarketValidationSearchResult[]> {
    return this.searchCommunityEvidenceSync(queries);
  }
}

function normalizeComplaint(snippet: string) {
  return normalize(snippet).replace(/[^a-z0-9]+/g, " ").trim();
}

function getSourceConfidence(source: MarketValidationSource) {
  if (source === "g2" || source === "capterra") return 0.9;
  if (source === "hackernews") return 0.8;
  if (source === "reddit" || source === "forum") return 0.7;
  return 0.5;
}

function getEvidenceIdentifier(url: string) {
  return url.split("/").filter(Boolean).at(-1) ?? url;
}

function sourceBreakdownKey(source: MarketValidationSource): keyof MarketValidation["sourceBreakdown"] | null {
  if (source === "forum") return "forums";
  if (source === "unknown") return null;
  return source;
}

export function clusterMarketEvidenceThemes(snippets: string[]): string[] {
  const text = snippets.map(normalize).join(" ");
  const themes: string[] = [];

  if (text.includes("reconciliation") || text.includes("mismatch")) {
    themes.push("Reconciliation mismatch");
  }
  if (text.includes("spreadsheet")) {
    themes.push("Spreadsheet tracking");
  }
  if (text.includes("audit") || text.includes("compliance")) {
    themes.push("Audit preparation");
  }
  if (text.includes("renewal") || text.includes("customer health")) {
    themes.push("Renewal visibility");
  }
  if (text.includes("escalation") || text.includes("ticket")) {
    themes.push("Escalation ownership");
  }
  if (text.includes("forecast") || text.includes("pipeline")) {
    themes.push("Forecast accuracy");
  }
  if (text.includes("reporting") || text.includes("close")) {
    themes.push("Reporting delays");
  }
  if (text.includes("cleanup") || text.includes("manual")) {
    themes.push("Manual cleanup");
  }
  if (text.includes("fragmented") || text.includes("across") || text.includes("systems")) {
    themes.push("Fragmented systems");
  }

  return unique(themes).slice(0, 5);
}

export function scoreMarketEvidence(input: ScoreMarketEvidenceInput) {
  const weightedSourceScore =
    input.sourceBreakdown.reddit * 1 +
    input.sourceBreakdown.forums * 1 +
    input.sourceBreakdown.hackernews * 2 +
    input.sourceBreakdown.g2 * 3 +
    input.sourceBreakdown.capterra * 3;
  const themeBonus = input.topThemes.length >= 3 ? 10 : input.topThemes.length >= 2 ? 5 : 0;
  const complaintScore = Math.min(input.complaintCount, 10) * 3;
  const score = weightedSourceScore * 5 + complaintScore + themeBonus;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getMarketValidationSignal(evidenceScore: number): MarketValidationSignal {
  if (evidenceScore >= 85) return "Strong";
  if (evidenceScore >= 70) return "Moderate";
  return "Weak";
}

export function extractMarketValidation(results: MarketValidationSearchResult[]): MarketValidation {
  const seenComplaints = new Set<string>();
  const sourceBreakdown = { ...EMPTY_SOURCE_BREAKDOWN };
  const painExamples: string[] = [];
  const sourceUrls: string[] = [];
  const evidenceSources: MarketValidationEvidenceSource[] = [];

  for (const result of results) {
    const complaintKey = normalizeComplaint(result.snippet);
    if (!complaintKey || seenComplaints.has(complaintKey)) continue;

    seenComplaints.add(complaintKey);
    painExamples.push(result.snippet);
    sourceUrls.push(result.url);
    evidenceSources.push({
      source: result.source,
      title: result.title,
      identifier: getEvidenceIdentifier(result.url),
      url: result.url,
      excerpt: result.snippet,
      confidence: getSourceConfidence(result.source),
    });

    const breakdownKey = sourceBreakdownKey(result.source);
    if (breakdownKey) {
      sourceBreakdown[breakdownKey] += 1;
    }
  }

  const topThemes = clusterMarketEvidenceThemes(painExamples);
  const complaintCount = painExamples.length;
  const evidenceScore = scoreMarketEvidence({
    sourceBreakdown,
    topThemes,
    complaintCount,
  });

  return {
    evidenceScore,
    marketSignal: getMarketValidationSignal(evidenceScore),
    complaintCount,
    sourceBreakdown,
    topThemes,
    painExamples: painExamples.slice(0, 5),
    sourceUrls: sourceUrls.slice(0, 8),
    evidenceSources: evidenceSources.slice(0, 8),
  };
}

export async function generateMarketValidationWithProvider(
  input: MarketValidationInput,
  provider: MarketValidationProvider,
): Promise<MarketValidation> {
  const queries = generateCanonicalPainQueries(input);
  const results = await provider.searchCommunityEvidence(queries);

  return extractMarketValidation(results);
}

export function generateMarketValidation(input: MarketValidationInput): MarketValidation {
  const queries = generateCanonicalPainQueries(input);
  const provider = new MockMarketValidationProvider();

  return extractMarketValidation(provider.searchCommunityEvidenceSync(queries));
}
