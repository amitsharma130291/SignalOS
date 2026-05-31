import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateSolutionGapAnalysis,
  type AutomationPotential,
  type SolutionGapAnalysisInput,
} from "../lib/solution-gap-engine.ts";

type ValidationCase = {
  name: string;
  input: SolutionGapAnalysisInput;
  expected: {
    automationPotential: AutomationPotential;
    failureModesInclude: string[];
  };
};

type AssertionResult = {
  label: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
};

const CASES: ValidationCase[] = [
  {
    name: "Finance reconciliation",
    input: {
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
    },
    expected: {
      automationPotential: "High",
      failureModesInclude: ["reconciliation mismatches", "exception tracking work", "reporting delays"],
    },
  },
  {
    name: "Sales Ops forecasting",
    input: {
      rawText:
        "Sales Operations reviews HubSpot opportunities, Airtable forecasts, Salesforce records, and Slack updates before every leadership forecast meeting. Numbers rarely match and managers manually reconcile the differences.",
      affectedTeam: "Sales Ops",
    },
    expected: {
      automationPotential: "High",
      failureModesInclude: ["forecast inaccuracies", "manual reconciliation"],
    },
  },
  {
    name: "Customer Success renewals",
    input: {
      rawText:
        "Our customer success managers keep a renewal spreadsheet because Salesforce doesn't capture all of the context they need. Before renewal meetings they spend hours cross-checking notes from Slack and customer calls.",
      affectedTeam: "Customer Success",
    },
    expected: {
      automationPotential: "Medium",
      failureModesInclude: ["renewal visibility gaps", "manual record cleanup"],
    },
  },
  {
    name: "Recruiting coordination",
    input: {
      rawText:
        "Recruiters move candidate information from LinkedIn into Greenhouse several times per day. Interview feedback arrives through Slack and email, forcing coordinators to manually update candidate status.",
      affectedTeam: "Recruiting",
    },
    expected: {
      automationPotential: "Medium",
      failureModesInclude: ["candidate status drift", "interview feedback bottlenecks"],
    },
  },
  {
    name: "Support escalations",
    input: {
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership isn't clear once engineering gets involved. Urgent issues are occasionally missed.",
      affectedTeam: "Support",
    },
    expected: {
      automationPotential: "Medium",
      failureModesInclude: ["ownership ambiguity", "missed escalations"],
    },
  },
  {
    name: "Operations compliance",
    input: {
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      affectedTeam: "Operations",
    },
    expected: {
      automationPotential: "High",
      failureModesInclude: ["spreadsheet consolidation work", "audit preparation bottlenecks"],
    },
  },
];

function assertExists(label: string, actual: unknown): AssertionResult {
  const passed = Array.isArray(actual) ? actual.length > 0 : Boolean(actual);
  return { label, actual, expected: "exists", passed };
}

function assertEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return { label, actual, expected, passed: actual === expected };
}

function assertNotUnknown(label: string, actual: string): AssertionResult {
  return {
    label,
    actual,
    expected: "not Unknown",
    passed: actual.trim().length > 0 && actual !== "Unknown",
  };
}

function assertIncludes(label: string, actual: string[], expected: string): AssertionResult {
  return {
    label,
    actual,
    expected: `includes ${expected}`,
    passed: actual.includes(expected),
  };
}

function validate(testCase: ValidationCase) {
  const analysis = generateSolutionGapAnalysis(testCase.input);
  const assertions = [
    assertNotUnknown("currentSolution", analysis.currentSolution),
    assertExists("failureModes", analysis.failureModes),
    assertNotUnknown("rootCause", analysis.rootCause),
    assertNotUnknown("businessImpact", analysis.businessImpact),
    assertExists("automationPotential", analysis.automationPotential),
    assertEqual(
      "automationPotential",
      analysis.automationPotential,
      testCase.expected.automationPotential,
    ),
  ];

  for (const failureMode of testCase.expected.failureModesInclude) {
    assertions.push(assertIncludes("failureModes", analysis.failureModes, failureMode));
  }

  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    input: testCase.input,
    analysis,
    assertions,
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
}

const results = CASES.map(validate);
const totalAssertions = results.reduce((total, result) => total + result.assertions.length, 0);
const failedAssertions = results.reduce((total, result) => total + result.failedAssertions.length, 0);
const passedAssertions = totalAssertions - failedAssertions;
const passPercentage = totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;
const report = {
  generatedAt: new Date().toISOString(),
  pipeline: "generateSolutionGapAnalysis",
  totals: {
    tests: results.length,
    passedTests: results.filter((result) => result.passed).length,
    failedTests: results.filter((result) => !result.passed).length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passPercentage,
  },
  results,
};

console.log("\nDay 15 Solution Gap Validation\n");
console.table(
  results.map((result) => ({
    test: result.name,
    result: result.passed ? "PASS" : "FAIL",
    automationPotential: result.analysis.automationPotential,
    failureModes: result.analysis.failureModes.length,
    failedAssertions: result.failedAssertions.length,
  })),
);

for (const result of results.filter((item) => !item.passed)) {
  console.log(`\n${result.name} failed`);
  for (const assertion of result.failedAssertions) {
    console.log(`- ${assertion.label}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
  }
  console.log(JSON.stringify(result.analysis, null, 2));
}

console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day15-solution-gap-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
