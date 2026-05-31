import {
  calculateOpportunityScore,
  getAutomationPotentialBonus,
  type OpportunityScoreInput,
} from "../lib/opportunity-score.ts";
import {
  generateSolutionGapAnalysis,
  type AutomationPotential,
  type SolutionGapAnalysisInput,
} from "../lib/solution-gap-engine.ts";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type ValidationCase = {
  name: string;
  analysisInput: SolutionGapAnalysisInput;
  scoreInput: Omit<OpportunityScoreInput, "automationPotential">;
  expectedPotential: AutomationPotential;
  expectedBonus: number;
};

type AssertionResult = {
  label: string;
  actual: unknown;
  expected: unknown;
  passed: boolean;
};

const CASES: ValidationCase[] = [
  {
    name: "Finance Stripe + NetSuite reconciliation",
    analysisInput: {
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
    },
    scoreInput: {
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Finance Ops",
      frequency: "weekly",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap:
        "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.",
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
    },
    expectedPotential: "High",
    expectedBonus: 5,
  },
  {
    name: "Sales Ops forecast reconciliation",
    analysisInput: {
      rawText:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
      affectedTeam: "Sales Ops",
    },
    scoreInput: {
      b2bScore: 5,
      monetizationScore: 7,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Sales Ops",
      frequency: "weekly",
      currentSolution: "HubSpot + Airtable + Salesforce + Slack",
      solutionGap:
        "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.",
      targetTitles: ["RevOps Manager"],
      icpGeneratedAt: new Date(),
      rawText:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
    },
    expectedPotential: "High",
    expectedBonus: 5,
  },
  {
    name: "Operations quarterly compliance",
    analysisInput: {
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      affectedTeam: "Operations",
    },
    scoreInput: {
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
    expectedPotential: "High",
    expectedBonus: 5,
  },
  {
    name: "Customer Success renewal workflow",
    analysisInput: {
      rawText:
        "Our customer success managers keep a renewal spreadsheet because Salesforce doesn't capture all of the context they need. Before renewal meetings they spend hours cross-checking notes from Slack and customer calls.",
      affectedTeam: "Customer Success",
    },
    scoreInput: {
      b2bScore: 3,
      monetizationScore: 5,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Customer Success",
      frequency: "weekly",
      currentSolution: "Salesforce + Slack + Spreadsheets",
      solutionGap:
        "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.",
      targetTitles: ["Head of Customer Success"],
      icpGeneratedAt: new Date(),
      rawText:
        "Our customer success managers keep a renewal spreadsheet because Salesforce doesn't capture all of the context they need. Before renewal meetings they spend hours cross-checking notes from Slack and customer calls.",
    },
    expectedPotential: "Medium",
    expectedBonus: 2,
  },
  {
    name: "Support escalation workflow",
    analysisInput: {
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership isn't clear once engineering gets involved. Urgent issues are occasionally missed.",
      affectedTeam: "Support",
    },
    scoreInput: {
      b2bScore: 2,
      monetizationScore: 4,
      urgency: "low",
      rawInputStatus: "accepted",
      affectedTeam: "Support",
      frequency: "daily",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap:
        "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership isn't clear once engineering gets involved. Urgent issues are occasionally missed.",
    },
    expectedPotential: "Medium",
    expectedBonus: 2,
  },
];

function assertEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return { label, actual, expected, passed: actual === expected };
}

function assertIncludes(label: string, actual: string[], expected: string): AssertionResult {
  return { label, actual, expected: `includes ${expected}`, passed: actual.includes(expected) };
}

function assertBetween(label: string, actual: number, min: number, max: number): AssertionResult {
  return {
    label,
    actual,
    expected: `${min} <= score <= ${max}`,
    passed: actual >= min && actual <= max,
  };
}

const results = CASES.map((testCase) => {
  const analysis = generateSolutionGapAnalysis(testCase.analysisInput);
  const bonus = getAutomationPotentialBonus(analysis.automationPotential);
  const score = calculateOpportunityScore({
    ...testCase.scoreInput,
    automationPotential: analysis.automationPotential,
  });
  const reason = `${analysis.automationPotential} automation potential added ${bonus} points.`;
  const assertions = [
    assertEqual("automation potential", analysis.automationPotential, testCase.expectedPotential),
    assertEqual("automation bonus", bonus, testCase.expectedBonus),
    assertBetween("final score", score.score, 0, 100),
  ];

  if (bonus > 0) {
    assertions.push(assertIncludes("score reasons", score.reasons, reason));
  }

  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    automationPotential: analysis.automationPotential,
    bonus,
    score: score.score,
    label: score.label,
    reasons: score.reasons,
    assertions,
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
});

const byName = Object.fromEntries(results.map((result) => [result.name, result]));
const rankingAssertions: AssertionResult[] = [
  {
    label: "Finance >= Sales Ops",
    actual: `${byName["Finance Stripe + NetSuite reconciliation"].score} >= ${byName["Sales Ops forecast reconciliation"].score}`,
    expected: true,
    passed:
      byName["Finance Stripe + NetSuite reconciliation"].score >=
      byName["Sales Ops forecast reconciliation"].score,
  },
  {
    label: "Finance >= Operations",
    actual: `${byName["Finance Stripe + NetSuite reconciliation"].score} >= ${byName["Operations quarterly compliance"].score}`,
    expected: true,
    passed:
      byName["Finance Stripe + NetSuite reconciliation"].score >=
      byName["Operations quarterly compliance"].score,
  },
  {
    label: "Support lowest",
    actual: byName["Support escalation workflow"].score,
    expected: "less than every other canonical score",
    passed: results
      .filter((result) => result.name !== "Support escalation workflow")
      .every((result) => byName["Support escalation workflow"].score < result.score),
  },
];

const totalAssertions =
  results.reduce((total, result) => total + result.assertions.length, 0) + rankingAssertions.length;
const failedAssertions =
  results.reduce((total, result) => total + result.failedAssertions.length, 0) +
  rankingAssertions.filter((assertion) => !assertion.passed).length;
const passedAssertions = totalAssertions - failedAssertions;
const passPercentage = totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;
const rankedResults = [...results].sort((left, right) => right.score - left.score);
const report = {
  generatedAt: new Date().toISOString(),
  pipeline: "generateSolutionGapAnalysis -> calculateOpportunityScore",
  totals: {
    tests: results.length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passPercentage,
  },
  rankingAssertions,
  ranking: rankedResults.map((result, index) => ({
    rank: index + 1,
    name: result.name,
    score: result.score,
    label: result.label,
    automationPotential: result.automationPotential,
    bonus: result.bonus,
  })),
  results,
};

console.log("\nDay 15.1 Automation Potential Validation\n");
console.table(report.ranking);
console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day15-automation-potential-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
