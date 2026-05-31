import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateEvidenceStrength, getEvidenceScoreModifier } from "../lib/evidence-strength.ts";
import { calculateOpportunityScore, type OpportunityScoreInput } from "../lib/opportunity-score.ts";
import { generateSolutionGapAnalysis } from "../lib/solution-gap-engine.ts";

type ValidationCase = {
  name: string;
  expectedStrength: "high" | "medium" | "low";
  expectedModifier: number;
  expectedScoreRange: [number, number];
  scoreInput: OpportunityScoreInput;
};

type AssertionResult = {
  label: string;
  actual: unknown;
  expected: unknown;
  passed: boolean;
};

const CASES: ValidationCase[] = [
  {
    name: "Finance reconciliation",
    expectedStrength: "high",
    expectedModifier: 5,
    expectedScoreRange: [8, 10],
    scoreInput: {
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Finance Ops",
      frequency: "weekly",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap:
        "Manual reconciliation creates mismatches, exception tracking work, reporting delays, and month-end close delays.",
      automationPotential: "High",
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
    },
  },
  {
    name: "Operations compliance",
    expectedStrength: "medium",
    expectedModifier: 0,
    expectedScoreRange: [5, 7],
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
      automationPotential: "High",
      targetTitles: ["Operations Manager", "Head of Operations", "COO"],
      icpGeneratedAt: new Date(),
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
    },
  },
  {
    name: "Sales Ops forecasting",
    expectedStrength: "medium",
    expectedModifier: 0,
    expectedScoreRange: [5, 8],
    scoreInput: {
      b2bScore: 5,
      monetizationScore: 7,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Sales Ops",
      frequency: "unknown",
      currentSolution: "Salesforce + HubSpot + Airtable + Slack",
      solutionGap: "Forecast inaccuracies, manual reconciliation, and inconsistent reporting.",
      automationPotential: "High",
      targetTitles: ["RevOps Manager"],
      icpGeneratedAt: new Date(),
      rawText:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
    },
  },
  {
    name: "Customer Success renewal workflow",
    expectedStrength: "medium",
    expectedModifier: 0,
    expectedScoreRange: [5, 7],
    scoreInput: {
      b2bScore: 3,
      monetizationScore: 5,
      urgency: "medium",
      rawInputStatus: "accepted",
      affectedTeam: "Customer Success",
      frequency: "weekly",
      currentSolution: "Salesforce + Slack + Spreadsheets",
      solutionGap: "Renewal visibility gaps and manual record cleanup.",
      automationPotential: "Medium",
      targetTitles: ["Head of Customer Success"],
      icpGeneratedAt: new Date(),
      rawText:
        "Our customer success managers keep a renewal spreadsheet because Salesforce doesn't capture all of the context they need. Before renewal meetings they spend hours cross-checking notes from Slack and customer calls.",
    },
  },
  {
    name: "Support escalation spreadsheet",
    expectedStrength: "low",
    expectedModifier: -5,
    expectedScoreRange: [0, 4],
    scoreInput: {
      b2bScore: 2,
      monetizationScore: 4,
      urgency: "low",
      rawInputStatus: "accepted",
      affectedTeam: "Support",
      frequency: "unknown",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
      automationPotential: "Medium",
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership isn't clear once engineering gets involved. Urgent issues are occasionally missed.",
    },
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
  const solutionGapAnalysis = generateSolutionGapAnalysis({
    rawText: testCase.scoreInput.rawText,
    affectedTeam: testCase.scoreInput.affectedTeam,
    currentSolution: testCase.scoreInput.currentSolution,
    solutionGap: testCase.scoreInput.solutionGap,
  });
  const evidence = generateEvidenceStrength({
    title: testCase.name,
    summary: testCase.scoreInput.rawText,
    current_solution: testCase.scoreInput.currentSolution,
    solution_gap: testCase.scoreInput.solutionGap,
    frequency: testCase.scoreInput.frequency,
    urgency: testCase.scoreInput.urgency,
    affected_team: testCase.scoreInput.affectedTeam,
  });
  const before = calculateOpportunityScore({
    ...testCase.scoreInput,
    automationPotential: solutionGapAnalysis.automationPotential,
  });
  const after = calculateOpportunityScore({
    ...testCase.scoreInput,
    automationPotential: solutionGapAnalysis.automationPotential,
    evidenceStrength: evidence.evidenceStrength,
  });
  const modifier = getEvidenceScoreModifier(evidence.evidenceStrength);
  const assertions = [
    assertEqual("evidence strength", evidence.evidenceStrength, testCase.expectedStrength),
    assertBetween(
      "evidence score",
      evidence.evidenceScore,
      testCase.expectedScoreRange[0],
      testCase.expectedScoreRange[1],
    ),
    assertBetween("evidence score bounds", evidence.evidenceScore, 0, 10),
    assertEqual("evidence modifier", modifier, testCase.expectedModifier),
    assertEqual("score delta", after.score - before.score, testCase.expectedModifier),
    assertBetween("final score", after.score, 0, 100),
  ];

  if (testCase.expectedStrength === "high") {
    assertions.push(assertIncludes("evidence reasons", evidence.evidenceReasons, "explicit business impact"));
  }

  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    beforeScore: before.score,
    afterScore: after.score,
    evidenceStrength: evidence.evidenceStrength,
    evidenceScore: evidence.evidenceScore,
    evidenceReasons: evidence.evidenceReasons,
    modifier,
    assertions,
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
});

const byName = Object.fromEntries(results.map((result) => [result.name, result]));
const rankingAssertions: AssertionResult[] = [
  {
    label: "Finance remains above Operations",
    actual: `${byName["Finance reconciliation"].afterScore} >= ${byName["Operations compliance"].afterScore}`,
    expected: true,
    passed: byName["Finance reconciliation"].afterScore >= byName["Operations compliance"].afterScore,
  },
  {
    label: "Support remains lowest",
    actual: byName["Support escalation spreadsheet"].afterScore,
    expected: "less than every other canonical score",
    passed: results
      .filter((result) => result.name !== "Support escalation spreadsheet")
      .every((result) => byName["Support escalation spreadsheet"].afterScore < result.afterScore),
  },
];

const totalAssertions =
  results.reduce((total, result) => total + result.assertions.length, 0) + rankingAssertions.length;
const failedAssertions =
  results.reduce((total, result) => total + result.failedAssertions.length, 0) +
  rankingAssertions.filter((assertion) => !assertion.passed).length;
const passedAssertions = totalAssertions - failedAssertions;
const passPercentage = totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;
const report = {
  generatedAt: new Date().toISOString(),
  pipeline: "generateEvidenceStrength -> calculateOpportunityScore",
  totals: {
    tests: results.length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passPercentage,
  },
  rankingAssertions,
  results,
};

console.log("\nDay 15.5 Evidence Strength Validation\n");
console.table(
  results.map((result) => ({
    test: result.name,
    evidence: result.evidenceStrength,
    evidenceScore: result.evidenceScore,
    before: result.beforeScore,
    modifier: result.modifier,
    after: result.afterScore,
    passed: result.passed,
  })),
);
console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day15-evidence-strength-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
