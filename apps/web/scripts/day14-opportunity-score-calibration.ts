import { calculateOpportunityScore, type OpportunityScoreInput } from "../lib/opportunity-score.ts";

type CalibrationCase = {
  name: string;
  input: OpportunityScoreInput;
};

const CASES: CalibrationCase[] = [
  {
    name: "Finance Ops Stripe + NetSuite reconciliation",
    input: {
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Finance Ops",
      frequency: "weekly",
      currentSolution: "NetSuite + Stripe + Spreadsheets",
      solutionGap:
        "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.",
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
    },
  },
  {
    name: "Sales Ops forecast reconciliation",
    input: {
      b2bScore: 5,
      monetizationScore: 7,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Sales Ops",
      frequency: "weekly",
      currentSolution: "HubSpot + Spreadsheets",
      solutionGap:
        "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.",
      targetTitles: ["RevOps Manager"],
      icpGeneratedAt: new Date(),
      rawText:
        "Revenue managers export HubSpot opportunities into spreadsheets every Monday before forecast calls. Team leads manually verify pipeline numbers because CRM data is often outdated.",
    },
  },
  {
    name: "Customer Success renewal spreadsheet",
    input: {
      b2bScore: 3,
      monetizationScore: 5,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Customer Success",
      frequency: "weekly",
      currentSolution: "Salesforce + Airtable",
      solutionGap:
        "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.",
      targetTitles: ["Head of Customer Success"],
      icpGeneratedAt: new Date(),
      rawText:
        "Customer Success managers export Salesforce account data into Airtable every Monday before renewal meetings. Teams manually clean customer records and cross-check health scores.",
    },
  },
  {
    name: "Operations quarterly compliance",
    input: {
      b2bScore: 12,
      monetizationScore: 9,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Operations",
      frequency: "quarterly",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap:
        "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.",
      targetTitles: ["Operations Manager", "Head of Operations", "COO"],
      icpGeneratedAt: new Date(),
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
    },
  },
  {
    name: "Support Zendesk escalation spreadsheet",
    input: {
      b2bScore: 2,
      monetizationScore: 4,
      urgency: "low",
      rawInputStatus: "accepted",
      affectedTeam: "Support",
      frequency: "daily",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap:
        "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
      rawText:
        "Support agents copy Zendesk tickets into Slack channels to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.",
    },
  },
];

const results = CASES.map((testCase) => ({
  name: testCase.name,
  score: calculateOpportunityScore(testCase.input).score,
  label: calculateOpportunityScore(testCase.input).label,
  reasons: calculateOpportunityScore(testCase.input).reasons,
})).sort((left, right) => right.score - left.score);

console.log("\nDay 14 Opportunity Score Calibration\n");
console.table(
  results.map((result, index) => ({
    rank: index + 1,
    signal: result.name,
    score: result.score,
    label: result.label,
  })),
);

for (const result of results) {
  console.log(`\n${result.name}: ${result.score}/100 ${result.label}`);
  for (const reason of result.reasons) {
    console.log(`- ${reason}`);
  }
}
