import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateICPFromPainSignal, type ICPPainSignalInput } from "../lib/icp-generator.ts";

type ValidationCase = {
  name: string;
  signal: ICPPainSignalInput;
  expected: {
    buyer: string;
    budgetOwner: string;
    triggerEvent: string;
    companySize: string;
    industryIncludes: string[];
    minConfidence: number;
    whyThisBuyerIncludes: string;
    topCandidate: string;
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
    name: "Finance Ops reconciliation",
    signal: {
      affectedTeam: "Finance Ops",
      pain: "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates exception tracking and month-end close delays.",
    },
    expected: {
      buyer: "Director Finance Operations",
      budgetOwner: "VP Finance",
      triggerEvent: "Month-end close delays",
      companySize: "500+ employees",
      industryIncludes: ["SaaS", "Fintech", "Marketplace"],
      minConfidence: 90,
      whyThisBuyerIncludes: "month-end close",
      topCandidate: "Director Finance Operations",
    },
  },
  {
    name: "Sales Ops forecasting",
    signal: {
      affectedTeam: "Sales Ops",
      pain: "Sales Ops teams track CRM reporting updates across HubSpot and Salesforce.",
      currentSolution: "HubSpot + Salesforce + Spreadsheets",
      solutionGap: "Outdated CRM data creates forecasting delays and reporting accuracy issues.",
    },
    expected: {
      buyer: "RevOps Manager",
      budgetOwner: "VP Revenue",
      triggerEvent: "Forecast accuracy concerns",
      companySize: "500+ employees",
      industryIncludes: ["B2B SaaS"],
      minConfidence: 90,
      whyThisBuyerIncludes: "forecast accuracy",
      topCandidate: "RevOps Manager",
    },
  },
  {
    name: "Customer Success renewals",
    signal: {
      affectedTeam: "Customer Success",
      pain: "Customer Success teams review Salesforce account health before renewal meetings.",
      currentSolution: "Salesforce + Airtable",
      solutionGap: "Manual cleanup creates reporting delays and renewal visibility gaps.",
    },
    expected: {
      buyer: "Head of Customer Success",
      budgetOwner: "VP Customer Success",
      triggerEvent: "Renewal visibility problems",
      companySize: "500+ employees",
      industryIncludes: ["SaaS"],
      minConfidence: 90,
      whyThisBuyerIncludes: "renewal visibility",
      topCandidate: "Head of Customer Success",
    },
  },
  {
    name: "Recruiting bottlenecks",
    signal: {
      affectedTeam: "Recruiting",
      pain: "Recruiting coordinators track candidate status across LinkedIn, Greenhouse, and Slack.",
      currentSolution: "LinkedIn + Greenhouse + Slack",
      solutionGap: "Scattered interview feedback creates scheduling delays and recruiting coordination bottlenecks.",
    },
    expected: {
      buyer: "Recruiting Operations Lead",
      budgetOwner: "VP Talent",
      triggerEvent: "Recruiting bottlenecks",
      companySize: "100-1000 employees",
      industryIncludes: ["Technology companies", "Recruiting-intensive businesses"],
      minConfidence: 90,
      whyThisBuyerIncludes: "recruiting operations",
      topCandidate: "Recruiting Operations Lead",
    },
  },
  {
    name: "Support escalations",
    signal: {
      affectedTeam: "Support",
      pain: "Support teams triage Zendesk tickets and Slack escalation handoffs.",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap: "Unclear ownership creates visibility gaps, missed escalations, and response delays.",
    },
    expected: {
      buyer: "Support Manager",
      budgetOwner: "VP Customer Experience",
      triggerEvent: "Escalation backlog",
      companySize: "100-1000 employees",
      industryIncludes: ["Customer-support-heavy businesses"],
      minConfidence: 90,
      whyThisBuyerIncludes: "ticket escalation",
      topCandidate: "Head of Support",
    },
  },
  {
    name: "Operations compliance",
    signal: {
      affectedTeam: "Operations",
      pain: "Operations managers prepare compliance reports from spreadsheets.",
      currentSolution: "Google Sheets + Slack",
      solutionGap: "Manual compliance reporting across several systems creates reporting delays.",
    },
    expected: {
      buyer: "Operations Manager",
      budgetOwner: "COO",
      triggerEvent: "Compliance reporting deadlines",
      companySize: "50-500 employees",
      industryIncludes: ["B2B"],
      minConfidence: 85,
      whyThisBuyerIncludes: "compliance processes",
      topCandidate: "Operations Manager",
    },
  },
  {
    name: "Sparse unknown team",
    signal: {
      affectedTeam: "Unknown",
      pain: "Teams coordinate reporting manually.",
    },
    expected: {
      buyer: "Operations Manager",
      budgetOwner: "COO",
      triggerEvent: "Cross-system reporting complexity",
      companySize: "50-500 employees",
      industryIncludes: ["B2B"],
      minConfidence: 40,
      whyThisBuyerIncludes: "cross-functional reporting",
      topCandidate: "Operations Manager",
    },
  },
];

function includes(value: string, expected: string) {
  return value.toLowerCase().includes(expected.toLowerCase());
}

function assertEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return { label, actual, expected, passed: actual === expected };
}

function assertAtLeast(label: string, actual: number, expected: number): AssertionResult {
  return { label, actual, expected: `>= ${expected}`, passed: actual >= expected };
}

function assertIncludes(label: string, actual: string, expected: string): AssertionResult {
  return { label, actual, expected: `contains ${expected}`, passed: includes(actual, expected) };
}

function assertIndustryIncludes(actual: string[], expected: string[]): AssertionResult {
  const missing = expected.filter((industry) => !actual.includes(industry));
  return {
    label: "ranked industries",
    actual,
    expected,
    passed: missing.length === 0,
  };
}

function validate(testCase: ValidationCase) {
  const icp = generateICPFromPainSignal(testCase.signal);
  const rankedIndustries = icp.ranked_industries.map((industry) => industry.industry);
  const assertions = [
    assertEqual("buyer", icp.buyer, testCase.expected.buyer),
    assertEqual("budget owner", icp.budget_owner, testCase.expected.budgetOwner),
    assertEqual("trigger event", icp.trigger_event, testCase.expected.triggerEvent),
    assertEqual("company size", icp.company_size, testCase.expected.companySize),
    assertIndustryIncludes(rankedIndustries, testCase.expected.industryIncludes),
    assertAtLeast("icp confidence", icp.icp_confidence, testCase.expected.minConfidence),
    assertIncludes("why this buyer", icp.why_this_buyer, testCase.expected.whyThisBuyerIncludes),
    assertEqual("top candidate", icp.icp_candidates[0]?.title, testCase.expected.topCandidate),
  ];
  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    signal: testCase.signal,
    icp,
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
  pipeline: "generateICPFromPainSignal",
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

console.log("\nDay 13 ICP Validation\n");
console.table(
  results.map((result) => ({
    test: result.name,
    result: result.passed ? "PASS" : "FAIL",
    buyer: result.icp.buyer,
    budgetOwner: result.icp.budget_owner,
    trigger: result.icp.trigger_event,
    companySize: result.icp.company_size,
    confidence: result.icp.icp_confidence,
    failedAssertions: result.failedAssertions.length,
  })),
);

for (const result of results.filter((item) => !item.passed)) {
  console.log(`\n${result.name} failed`);
  for (const assertion of result.failedAssertions) {
    console.log(`- ${assertion.label}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
  }
  console.log(JSON.stringify(result.icp, null, 2));
}

console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day13-icp-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
