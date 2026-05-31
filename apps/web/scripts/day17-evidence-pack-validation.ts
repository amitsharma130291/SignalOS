import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateBuyerMapping } from "../lib/buyer-mapping-engine.ts";
import { generateEvidenceStrength } from "../lib/evidence-strength.ts";
import { generateEvidencePack, type EvidencePackInput } from "../lib/evidence-pack-generator.ts";
import { generateSolutionGapAnalysis } from "../lib/solution-gap-engine.ts";

type ValidationCase = {
  name: string;
  input: EvidencePackInput;
  expectedKnown: string[];
  expectedGaps: string[];
  expectedTargetRange: [number, number];
};

type AssertionResult = {
  label: string;
  actual: unknown;
  expected: unknown;
  passed: boolean;
};

const CASES: ValidationCase[] = [
  {
    name: "Finance Stripe NetSuite reconciliation",
    input: {
      rawText:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping because mismatches take manual follow-up.",
      pain: "Finance reconciliation slows month-end close.",
      urgency: "high",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches and month-end close delays.",
      monetizationScore: 8,
      founderConviction: 9,
    },
    expectedKnown: [
      "weekly workflow cadence",
      "Finance Ops team is affected",
      "Stripe appears in the current workflow",
      "NetSuite appears in the current workflow",
      "spreadsheets appears in the current workflow",
      "month-end close delay is present",
    ],
    expectedGaps: ["Budget owner confirmation"],
    expectedTargetRange: [9, 10],
  },
  {
    name: "Operations quarterly compliance",
    input: {
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      pain: "Operations reporting requires manual consolidation.",
      urgency: "high",
      frequency: "quarterly",
      affectedTeam: "Operations",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap:
        "Manual spreadsheet consolidation creates compliance reporting delays and audit-prep bottlenecks.",
      monetizationScore: 9,
      founderConviction: 8,
    },
    expectedKnown: [
      "quarterly workflow cadence",
      "Operations team is affected",
      "compliance reporting workflow is present",
      "internal systems appears in the current workflow",
      "audit preparation is part of the workflow",
    ],
    expectedGaps: ["Budget owner confirmation", "Quantified manual effort", "Compliance cost impact"],
    expectedTargetRange: [8, 8],
  },
  {
    name: "Support Zendesk escalation tracking",
    input: {
      rawText:
        "Support managers maintain a spreadsheet of critical Zendesk escalations because ownership is unclear. Urgent issues are occasionally missed.",
      pain: "Support escalation tracking is manual.",
      urgency: "low",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear and urgent issues can be missed.",
      monetizationScore: 4,
      founderConviction: 3,
    },
    expectedKnown: [
      "Support team is affected",
      "Zendesk appears in the current workflow",
      "spreadsheets appears in the current workflow",
      "missed escalations are present",
    ],
    expectedGaps: [
      "Budget owner confirmation",
      "Quantified manual effort",
      "Escalation business impact",
    ],
    expectedTargetRange: [6, 6],
  },
];

function assertIncludes(label: string, actual: string[], expected: string): AssertionResult {
  return { label, actual, expected: `includes ${expected}`, passed: actual.includes(expected) };
}

function assertBetween(label: string, actual: number, min: number, max: number): AssertionResult {
  return {
    label,
    actual,
    expected: `${min} <= value <= ${max}`,
    passed: actual >= min && actual <= max,
  };
}

function assertNoBannedLanguage(label: string, pack: unknown): AssertionResult {
  const serialized = JSON.stringify(pack).toLowerCase();
  const banned = ["interview", "schedule", "book a", "request a meeting"];
  const found = banned.filter((term) => serialized.includes(term));

  return {
    label,
    actual: found,
    expected: "no interview scheduling or request language",
    passed: found.length === 0,
  };
}

function enrichInput(input: EvidencePackInput): EvidencePackInput {
  const solutionGapAnalysis = generateSolutionGapAnalysis({
    rawText: input.rawText,
    pain: input.pain,
    affectedTeam: input.affectedTeam,
    currentSolution: input.currentSolution,
    solutionGap: input.solutionGap,
  });
  const evidenceAnalysis = generateEvidenceStrength({
    title: input.pain,
    summary: input.rawText,
    current_solution: input.currentSolution,
    solution_gap: input.solutionGap,
    frequency: input.frequency,
    urgency: input.urgency,
    affected_team: input.affectedTeam,
  });
  const buyerMapping = generateBuyerMapping({
    narrative: input.rawText,
    pain: input.pain,
    affectedTeam: input.affectedTeam,
    currentSolution: input.currentSolution,
    solutionGap: input.solutionGap,
    businessImpact: solutionGapAnalysis.businessImpact,
  });

  return {
    ...input,
    evidenceAnalysis,
    buyerMapping,
  };
}

const results = CASES.map((testCase) => {
  const input = enrichInput(testCase.input);
  const pack = generateEvidencePack(input);
  const assertions: AssertionResult[] = [
    ...testCase.expectedKnown.map((expected) =>
      assertIncludes(`known evidence: ${expected}`, pack.currentEvidence.known, expected),
    ),
    ...testCase.expectedGaps.map((expected) =>
      assertIncludes(
        `evidence gap: ${expected}`,
        pack.evidenceGaps.map((gap) => gap.label),
        expected,
      ),
    ),
    assertBetween(
      "target score",
      pack.evidenceUpgradePlan.targetScore,
      testCase.expectedTargetRange[0],
      testCase.expectedTargetRange[1],
    ),
    assertBetween("current score", pack.evidenceUpgradePlan.currentScore, 0, 10),
    assertNoBannedLanguage("banned language", pack),
    {
      label: "validation plan mirrors gaps",
      actual: pack.validationPlan.map((item) => item.validationItem),
      expected: "one validation plan item per evidence gap",
      passed: pack.validationPlan.length === pack.evidenceGaps.length,
    },
    {
      label: "validation plan has complete fields",
      actual: pack.validationPlan,
      expected: "validation item, why, question, and expected gain",
      passed: pack.validationPlan.every(
        (item) =>
          item.validationItem.length > 0 &&
          item.whyItMatters.length > 0 &&
          item.questionToAnswer.length > 0 &&
          item.expectedConfidenceGain.length > 0,
      ),
    },
  ];
  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    evidenceStrength: input.evidenceAnalysis?.evidenceStrength,
    evidenceScore: input.evidenceAnalysis?.evidenceScore,
    evidencePack: pack,
    assertions,
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
});

const totalAssertions = results.reduce((total, result) => total + result.assertions.length, 0);
const failedAssertions = results.reduce((total, result) => total + result.failedAssertions.length, 0);
const passedAssertions = totalAssertions - failedAssertions;
const passPercentage =
  totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;
const report = {
  generatedAt: new Date().toISOString(),
  pipeline: "generateEvidenceStrength -> generateBuyerMapping -> generateEvidencePack",
  totals: {
    tests: results.length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passPercentage,
  },
  results,
};

console.log("\nDay 17 Evidence Pack Validation\n");
console.table(
  results.map((result) => ({
    test: result.name,
    evidence: result.evidenceStrength,
    score: result.evidenceScore,
    target: result.evidencePack.evidenceUpgradePlan.targetScore,
    passed: result.passed,
  })),
);
console.log("\nSummary");
console.log(`Total passed assertions: ${passedAssertions}`);
console.log(`Total failed assertions: ${failedAssertions}`);
console.log(`Pass percentage: ${passPercentage}%`);

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day17-evidence-pack-validation-report.json");
mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Saved JSON report: ${reportPath}`);
