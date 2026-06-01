import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateBuyerMapping } from "../lib/buyer-mapping-engine.ts";
import { generateEvidenceStrength } from "../lib/evidence-strength.ts";
import {
  buildQualificationTrust,
  buildTrustedField,
  getTrustBadge,
  mergeEvidenceSources,
  type TrustState,
} from "../lib/evidence-trust.ts";
import { generateEvidencePack } from "../lib/evidence-pack-generator.ts";
import { generateOpportunityReadiness } from "../lib/opportunity-readiness.ts";
import { generateSolutionGapAnalysis } from "../lib/solution-gap-engine.ts";

type AssertionResult = {
  label: string;
  actual: unknown;
  expected: unknown;
  passed: boolean;
};

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

function trustCase(label: string, value: string | null, sources: Parameters<typeof buildTrustedField>[1]) {
  const field = buildTrustedField(value, sources);
  return {
    label,
    field,
  };
}

const primitiveCases = [
  trustCase("missing state", "Unknown", ["workflow_signal"]),
  trustCase("inferred state", "Controller", ["buyer_mapping"]),
  trustCase("validated state", "CFO", ["workflow_signal", "job_posting"]),
  trustCase("human confirmed state", "VP Finance", ["buyer_mapping", "founder_confirmation"]),
];

const solutionGapAnalysis = generateSolutionGapAnalysis({
  rawText:
    "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  pain: "Finance reconciliation delays month-end close",
  affectedTeam: "Finance Ops",
  currentSolution: "Stripe + NetSuite + spreadsheets",
  solutionGap:
    "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
});
const evidenceAnalysis = generateEvidenceStrength({
  title: "Finance reconciliation delays month-end close",
  summary:
    "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  affected_team: "Finance Ops",
  frequency: "daily",
  current_solution: "Stripe + NetSuite + spreadsheets",
  solution_gap:
    "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
});
const buyerMapping = generateBuyerMapping({
  narrative:
    "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  pain: "Finance reconciliation delays month-end close",
  affectedTeam: "Finance Ops",
  currentSolution: "Stripe + NetSuite + spreadsheets",
  solutionGap:
    "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  businessImpact: solutionGapAnalysis.businessImpact,
});
const evidencePack = generateEvidencePack({
  rawText:
    "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  pain: "Finance reconciliation delays month-end close",
  affectedTeam: "Finance Ops",
  frequency: "daily",
  currentSolution: "Stripe + NetSuite + spreadsheets",
  solutionGap:
    "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  evidenceAnalysis,
  buyerMapping,
});
const readiness = generateOpportunityReadiness({
  pain: "Finance reconciliation delays month-end close",
  affectedTeam: "Finance Ops",
  frequency: "daily",
  currentSolution: "Stripe + NetSuite + spreadsheets",
  solutionGap:
    "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
  buyer: "Controller",
  budgetOwner: "CFO",
  targetTitles: ["Controller"],
  evidenceAnalysis,
  evidencePack,
  buyerMapping,
  solutionGapAnalysis,
  humanConfirmedFields: {
    buyer: true,
  },
});
const qualificationTrust = buildQualificationTrust({
  workflow: "Stripe + NetSuite + spreadsheets",
  businessImpact: solutionGapAnalysis.businessImpact,
  painOwner: buyerMapping.decisionMap.suffers,
  buyer: buyerMapping.decisionMap.buyer,
  budgetOwner: "CFO",
  economicBuyer: buyerMapping.decisionMap.economicBuyer,
  frequency: "daily",
  economicCase: `${solutionGapAnalysis.businessImpact} + CFO`,
  targetTitles: ["Controller"],
  humanConfirmedFields: {
    buyer: true,
  },
  evidenceAnalysis,
  evidencePack,
  buyerMapping,
  solutionGapAnalysis,
});

const expectedPrimitiveStates: TrustState[] = [
  "missing",
  "inferred",
  "validated",
  "human_confirmed",
];

const assertions: AssertionResult[] = [
  ...primitiveCases.map((testCase, index) =>
    assertEqual(testCase.label, testCase.field.trustState, expectedPrimitiveStates[index]),
  ),
  assertEqual("missing evidence count", primitiveCases[0].field.evidenceCount, 0),
  assertEqual("validated evidence count", primitiveCases[2].field.evidenceCount, 2),
  assertIncludes("validated source tracking", primitiveCases[2].field.evidenceSources, "job_posting"),
  assertEqual(
    "source merging deduplicates",
    mergeEvidenceSources(["workflow_signal"], ["workflow_signal", "buyer_mapping"]).length,
    2,
  ),
  assertEqual("badge generation", getTrustBadge("human_confirmed").label, "Human Confirmed"),
  assertEqual("qualification workflow trust", qualificationTrust.workflow.trustState, "validated"),
  assertEqual("qualification buyer trust", qualificationTrust.buyer.trustState, "human_confirmed"),
  assertEqual("readiness stage unchanged", readiness.stage, "Outreach Ready"),
  assertEqual("readiness milestones trust-aware", readiness.milestones.every((item) => item.trustState), true),
  assertEqual("readiness exposes trusted fields", readiness.trustedFields.buyer.trustState, "human_confirmed"),
  assertIncludes("readiness source tracking", readiness.trustedFields.workflow.evidenceSources, "workflow_signal"),
];

const failedAssertions = assertions.filter((assertion) => !assertion.passed);
const passedAssertions = assertions.length - failedAssertions.length;
const passPercentage =
  assertions.length === 0 ? 100 : Math.round((passedAssertions / assertions.length) * 10000) / 100;

const report = {
  generatedAt: new Date().toISOString(),
  pipeline:
    "generateEvidenceStrength -> generateBuyerMapping -> generateEvidencePack -> generateOpportunityReadiness -> buildQualificationTrust",
  totals: {
    totalAssertions: assertions.length,
    passedAssertions,
    failedAssertions: failedAssertions.length,
    passPercentage,
  },
  primitiveCases,
  qualificationTrust,
  readiness,
  assertions,
  failedAssertions,
};

console.log("\nDay 18 Evidence Trust Validation\n");
console.table(
  primitiveCases.map((testCase) => ({
    test: testCase.label,
    trustState: testCase.field.trustState,
    evidenceCount: testCase.field.evidenceCount,
    sources: testCase.field.evidenceSources.join(", "),
  })),
);
console.log("\nReadiness Integration");
console.table(
  readiness.milestones.map((milestone) => ({
    milestone: milestone.name,
    complete: milestone.complete,
    trustState: milestone.trustState,
    evidenceCount: milestone.evidenceCount,
  })),
);
console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions.length}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day18-trust-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);

if (failedAssertions.length > 0) {
  process.exitCode = 1;
}
