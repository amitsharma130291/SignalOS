import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractMarketValidation,
  generateCanonicalPainQueries,
  MockMarketValidationProvider,
  type MarketValidationInput,
} from "../lib/market-validation.ts";

type ValidationCase = {
  name: string;
  input: MarketValidationInput;
};

const CASES: ValidationCase[] = [
  {
    name: "Finance",
    input: {
      rawText:
        "Finance analysts reconcile Stripe payouts against NetSuite every day and close reporting slips.",
      pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates reporting delays and month-end close risk.",
    },
  },
  {
    name: "Sales Ops",
    input: {
      rawText: "Sales Ops reconciles forecast inputs across Salesforce, HubSpot, and spreadsheets.",
      pain: "Forecast mismatches require manual CRM cleanup.",
      affectedTeam: "Sales Operations",
      currentSolution: "Salesforce + HubSpot + Spreadsheets",
      solutionGap: "Forecast updates require cross-system manual work.",
    },
  },
  {
    name: "Customer Success",
    input: {
      rawText: "Customer Success reviews renewal risk across Salesforce, Slack, and spreadsheets.",
      pain: "Renewal visibility gaps make customer health hard to track.",
      affectedTeam: "Customer Success",
      currentSolution: "Salesforce + Slack + Spreadsheets",
      solutionGap: "Customer health context is fragmented before renewals.",
    },
  },
  {
    name: "Support",
    input: {
      rawText: "Support managers track Zendesk escalations in spreadsheets and Slack.",
      pain: "Escalation ownership is unclear and urgent tickets get missed.",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap: "Escalation follow-up is delayed.",
    },
  },
  {
    name: "Operations",
    input: {
      rawText: "Operations prepares audit evidence across spreadsheets and email.",
      pain: "Compliance reporting and evidence collection are manual.",
      affectedTeam: "Operations",
      currentSolution: "Spreadsheets + Email",
      solutionGap: "Audit preparation is delayed by manual evidence collection.",
    },
  },
];

const provider = new MockMarketValidationProvider();

const results = await Promise.all(
  CASES.map(async (testCase) => {
    const queries = generateCanonicalPainQueries(testCase.input);
    const searchResults = await provider.searchCommunityEvidence(queries);
    const validation = extractMarketValidation(searchResults);

    return {
      name: testCase.name,
      queries,
      complaintCount: validation.complaintCount,
      evidenceScore: validation.evidenceScore,
      marketSignal: validation.marketSignal,
      themes: validation.topThemes,
      sourceBreakdown: validation.sourceBreakdown,
      representativeExamples: validation.painExamples.slice(0, 3),
      sourceUrls: validation.sourceUrls,
      evidenceSources: validation.evidenceSources,
    };
  }),
);

const report = {
  generatedAt: new Date().toISOString(),
  mode: "mock-first",
  externalCalls: false,
  cases: results,
  passed: results.every(
    (result) =>
      result.queries.length >= 3 &&
      result.complaintCount > 0 &&
      result.evidenceScore > 0 &&
      result.themes.length > 0,
  ),
};

const outputPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../artifacts/day22-market-validation-report.json",
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Day 22 market validation report written to ${outputPath}`);

if (!report.passed) {
  process.exitCode = 1;
}
