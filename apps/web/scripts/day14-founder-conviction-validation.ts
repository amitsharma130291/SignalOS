import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateFounderConviction,
  type FounderConvictionInput,
  type FounderConvictionRecommendation,
} from "../lib/founder-conviction.ts";

type ValidationCase = {
  name: string;
  input: FounderConvictionInput;
  expected: {
    minScore: number;
    maxScore: number;
    recommendation: FounderConvictionRecommendation;
    reasonsInclude?: string[];
    risksInclude?: string[];
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
    name: "High finance reconciliation",
    input: {
      rawText:
        "Finance analysts download Stripe payouts every day and manually reconcile them against NetSuite. Exceptions are tracked in spreadsheets and month-end close is delayed whenever transaction volume increases.",
      pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
      urgency: "high",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap:
        "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.",
      affectedTeam: "Finance Ops",
      monetizationScore: 8,
      buyer: "Director Finance Operations",
      budgetOwner: "VP Finance",
      triggerEvent: "Month-end close delays",
      targetTitles: ["Director Finance Operations", "Controller", "VP Finance"],
      companySize: "500+ employees",
      industry: "SaaS",
    },
    expected: {
      minScore: 8,
      maxScore: 10,
      recommendation: "high",
      reasonsInclude: ["Daily workflow", "Revenue or budget impact", "Multi-system workflow"],
    },
  },
  {
    name: "High Sales Ops forecasting",
    input: {
      rawText:
        "Revenue managers export HubSpot opportunities into spreadsheets every Monday before forecast calls. Team leads manually verify pipeline numbers because CRM data is often outdated.",
      pain: "Sales Ops teams track CRM reporting updates across HubSpot and spreadsheets.",
      urgency: "medium",
      frequency: "weekly",
      currentSolution: "HubSpot + Spreadsheets",
      solutionGap:
        "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.",
      affectedTeam: "Sales Ops",
      monetizationScore: 7,
      buyer: "RevOps Manager",
      budgetOwner: "VP Revenue",
      triggerEvent: "Forecast accuracy concerns",
      targetTitles: ["RevOps Manager", "Sales Operations Lead"],
      industry: "B2B SaaS",
    },
    expected: {
      minScore: 7.5,
      maxScore: 9,
      recommendation: "high",
    },
  },
  {
    name: "Medium Customer Success renewals",
    input: {
      rawText:
        "Customer Success managers export Salesforce account data into Airtable every Monday before renewal meetings. Teams manually clean customer records and cross-check health scores.",
      pain: "Customer Success teams review account health before renewal meetings.",
      urgency: "medium",
      frequency: "weekly",
      currentSolution: "Salesforce + Airtable",
      solutionGap:
        "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.",
      affectedTeam: "Customer Success",
      monetizationScore: 5,
      buyer: "Head of Customer Success",
      budgetOwner: "VP Customer Success",
      triggerEvent: "Renewal visibility problems",
      targetTitles: ["Head of Customer Success"],
    },
    expected: {
      minScore: 5.5,
      maxScore: 7.5,
      recommendation: "medium",
    },
  },
  {
    name: "Medium Support escalations",
    input: {
      rawText:
        "Support agents copy Zendesk tickets into Slack channels throughout the day to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.",
      pain: "Support teams triage Zendesk tickets and Slack escalation handoffs.",
      urgency: "medium",
      frequency: "daily",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap:
        "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
      affectedTeam: "Support",
      monetizationScore: 4,
      buyer: "Support Manager",
      budgetOwner: "VP Customer Experience",
      triggerEvent: "Escalation backlog",
      targetTitles: ["Head of Support"],
    },
    expected: {
      minScore: 5.5,
      maxScore: 7.5,
      recommendation: "medium",
    },
  },
  {
    name: "Low weak discussion",
    input: {
      rawText: "Support leaders occasionally discuss ticket ownership during monthly meetings.",
      pain: "Support leaders discuss ticket ownership.",
      urgency: "low",
      frequency: "monthly",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
      affectedTeam: "Support",
      monetizationScore: 1,
      filterScore: 0,
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Unknown",
      targetTitles: [],
    },
    expected: {
      minScore: 0,
      maxScore: 3,
      recommendation: "low",
      risksInclude: ["Unknown current solution", "Unknown buyer"],
    },
  },
  {
    name: "Medium Operations compliance audit",
    input: {
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      pain: "Teams coordinate compliance reporting and spreadsheets manually.",
      urgency: "high",
      frequency: "quarterly",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap:
        "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.",
      affectedTeam: "Operations",
      monetizationScore: 9,
      buyer: "Operations Manager",
      budgetOwner: "COO",
      triggerEvent: "Quarterly compliance reporting deadline",
      targetTitles: ["Operations Manager", "Head of Operations", "COO"],
      companySize: "50-500 employees",
      industry: "B2B",
    },
    expected: {
      minScore: 5.5,
      maxScore: 7.5,
      recommendation: "medium",
      reasonsInclude: ["Quarterly workflow", "Revenue or budget impact", "Two-system workflow"],
    },
  },
  {
    name: "Low noise offsite",
    input: {
      rawText: "Our company had a team lunch on Friday and everyone discussed future plans.",
      pain: "No meaningful operational pain detected.",
      urgency: "low",
      frequency: "unknown",
      currentSolution: "Unknown",
      solutionGap: "Unknown",
      affectedTeam: "Operations",
      monetizationScore: 1,
      filterScore: 0,
      buyer: "Unknown",
      budgetOwner: "Unknown",
      triggerEvent: "Unknown",
      targetTitles: [],
    },
    expected: {
      minScore: 0,
      maxScore: 1,
      recommendation: "low",
      risksInclude: ["Generic pain wording"],
    },
  },
];

function assertRange(label: string, actual: number, min: number, max: number): AssertionResult {
  return {
    label,
    actual,
    expected: `${min} <= score <= ${max}`,
    passed: actual >= min && actual <= max,
  };
}

function assertEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return {
    label,
    actual,
    expected,
    passed: actual === expected,
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
  const result = generateFounderConviction(testCase.input);
  const assertions = [
    assertRange("score range", result.score, testCase.expected.minScore, testCase.expected.maxScore),
    assertEqual("recommendation", result.recommendation, testCase.expected.recommendation),
    assertRange("score lower bound", result.score, 0, 10),
  ];

  for (const reason of testCase.expected.reasonsInclude ?? []) {
    assertions.push(assertIncludes("reason", result.reasons, reason));
  }

  for (const risk of testCase.expected.risksInclude ?? []) {
    assertions.push(assertIncludes("risk", result.risks, risk));
  }

  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    inputSummary: {
      pain: testCase.input.pain,
      frequency: testCase.input.frequency,
      currentSolution: testCase.input.currentSolution,
      solutionGap: testCase.input.solutionGap,
      buyer: testCase.input.buyer,
      budgetOwner: testCase.input.budgetOwner,
    },
    score: result.score,
    recommendation: result.recommendation,
    reasons: result.reasons,
    risks: result.risks,
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
  pipeline: "generateFounderConviction",
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

console.log("\nDay 14 Founder Conviction Validation\n");
console.table(
  results.map((result) => ({
    test: result.name,
    result: result.passed ? "PASS" : "FAIL",
    score: result.score,
    recommendation: result.recommendation,
    failedAssertions: result.failedAssertions.length,
  })),
);

for (const result of results.filter((item) => !item.passed)) {
  console.log(`\n${result.name} failed`);
  for (const assertion of result.failedAssertions) {
    console.log(`- ${assertion.label}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
  }
  console.log(JSON.stringify(result, null, 2));
}

console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day14-founder-conviction-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
