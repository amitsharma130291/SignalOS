import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateBuyerMapping } from "./buyer-mapping-engine.ts";
import { generateEvidenceStrength } from "./evidence-strength.ts";
import { generateEvidencePack } from "./evidence-pack-generator.ts";
import { generateSolutionGapAnalysis } from "./solution-gap-engine.ts";

function buildPack(input: {
  name: string;
  rawText?: string | null;
  pain?: string | null;
  urgency?: string | null;
  frequency?: string | null;
  affectedTeam?: string | null;
  currentSolution?: string | null;
  solutionGap?: string | null;
  monetizationScore?: number | null;
  founderConviction?: number | null;
}) {
  const solutionGapAnalysis = generateSolutionGapAnalysis({
    rawText: input.rawText,
    pain: input.pain,
    affectedTeam: input.affectedTeam,
    currentSolution: input.currentSolution,
    solutionGap: input.solutionGap,
  });
  const evidenceAnalysis = generateEvidenceStrength({
    title: input.name,
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

  return generateEvidencePack({
    ...input,
    evidenceAnalysis,
    buyerMapping,
  });
}

function flattenPack(pack: ReturnType<typeof generateEvidencePack>) {
  return JSON.stringify(pack).toLowerCase();
}

describe("generateEvidencePack", () => {
  it("generates a finance evidence pack with known workflow proof and high target score", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
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
    });

    assert.ok(pack.currentEvidence.known.includes("weekly workflow cadence"));
    assert.ok(pack.currentEvidence.known.includes("Finance Ops team is affected"));
    assert.ok(pack.currentEvidence.known.includes("Stripe appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("NetSuite appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("spreadsheets appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("month-end close delay is present"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Budget owner confirmation"));
    assert.ok(pack.evidenceDrivers.positive.includes("Clear affected team"));
    assert.ok(pack.evidenceDrivers.positive.includes("Clear workflow pattern"));
    assert.ok(pack.evidenceDrivers.positive.includes("Current systems identified"));
    assert.ok(pack.evidenceUpgradePlan.targetScore >= 9);
  });

  it("generates an operations compliance evidence pack that keeps medium-confidence gaps visible", () => {
    const pack = buildPack({
      name: "Operations compliance",
      rawText:
        "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.",
      pain: "Operations reporting requires manual consolidation.",
      urgency: "high",
      frequency: "quarterly",
      affectedTeam: "Operations",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap: "Manual spreadsheet consolidation creates compliance reporting delays and audit-prep bottlenecks.",
      monetizationScore: 9,
      founderConviction: 8,
    });

    assert.ok(pack.currentEvidence.known.includes("quarterly workflow cadence"));
    assert.ok(pack.currentEvidence.known.includes("Operations team is affected"));
    assert.ok(pack.currentEvidence.known.includes("compliance reporting workflow is present"));
    assert.ok(pack.currentEvidence.known.includes("internal systems appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("audit preparation is part of the workflow"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Budget owner confirmation"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Quantified manual effort"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Compliance cost impact"));
    assert.equal(pack.evidenceUpgradePlan.currentScore <= 7, true);
  });

  it("generates a lower-confidence support pack with missing buyer and frequency evidence", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
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
    });

    assert.ok(pack.currentEvidence.known.includes("Support team is affected"));
    assert.ok(pack.currentEvidence.known.includes("Zendesk appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("spreadsheets appears in the current workflow"));
    assert.ok(pack.currentEvidence.known.includes("missed escalations are present"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Budget owner confirmation"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Quantified manual effort"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Escalation business impact"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Workflow frequency confirmation"));
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Workflow ownership confirmation"));
    assert.equal(pack.evidenceUpgradePlan.currentScore <= 4, true);
  });

  it("handles unknown fields without crashing", () => {
    const pack = generateEvidencePack({
      pain: null,
      frequency: "Unknown",
      affectedTeam: null,
      currentSolution: null,
      solutionGap: null,
      evidenceAnalysis: null,
      buyerMapping: null,
    });

    assert.ok(pack.currentEvidence.known.length > 0);
    assert.ok(pack.evidenceGaps.some((gap) => gap.label === "Budget owner confirmation"));
    assert.equal(pack.evidenceUpgradePlan.currentScore, 0);
  });

  it("uses the current evidence score in the upgrade plan", () => {
    const pack = generateEvidencePack({
      evidenceAnalysis: {
        evidenceStrength: "medium",
        evidenceScore: 6,
        evidenceReasons: [],
      },
    });

    assert.equal(pack.evidenceUpgradePlan.currentScore, 6);
    assert.equal(pack.evidenceUpgradePlan.targetScore, 8);
  });

  it("uses only non-scheduling validation actions", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("schedule")));
    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("call")));
    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("search")));
    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("review")));
    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("reddit")));
    assert.ok(pack.nextResearchActions.every((step) => !step.toLowerCase().includes("g2")));
    assert.ok(pack.nextResearchActions.some((step) => step.includes("escalation")));
  });

  it("does not include interview scheduling or request language", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });
    const serialized = flattenPack(pack);

    assert.equal(serialized.includes("interview"), false);
    assert.equal(serialized.includes("schedule"), false);
    assert.equal(serialized.includes("book a"), false);
    assert.equal(serialized.includes("request a meeting"), false);
  });

  it("keeps uncertainty language out of known evidence", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });
    const knownEvidence = JSON.stringify(pack.currentEvidence).toLowerCase();

    assert.equal(knownEvidence.includes("unknown"), false);
    assert.equal(knownEvidence.includes("missing"), false);
    assert.equal(knownEvidence.includes("ambiguous"), false);
    assert.equal(knownEvidence.includes("ambiguity"), false);
    assert.ok(
      pack.validationQuestions.includes("Which role evaluates and buys solutions for this workflow?"),
    );
  });

  it("generates evidence drivers", () => {
    const pack = buildPack({
      name: "Operations compliance",
      frequency: "quarterly",
      affectedTeam: "Operations",
      currentSolution: "Spreadsheets + Internal systems",
      solutionGap: "Manual compliance reporting creates audit-prep bottlenecks.",
      monetizationScore: 0,
    });

    assert.ok(pack.evidenceDrivers.positive.length > 0);
    assert.ok(pack.evidenceDrivers.negative.length > 0);
    assert.ok(pack.evidenceDrivers.positive.includes("Clear affected team"));
    assert.ok(pack.evidenceDrivers.negative.includes("Missing financial impact"));
  });

  it("uses gap-specific finance research actions", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      frequency: "unknown",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches.",
    });

    assert.ok(pack.nextResearchActions.every((action) => !action.toLowerCase().includes("search")));
    assert.ok(pack.nextResearchActions.includes("Validate budget ownership."));
    assert.ok(pack.nextResearchActions.includes("Quantify manual effort."));
  });

  it("uses gap-specific support research actions", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.ok(pack.nextResearchActions.includes("Validate budget ownership."));
    assert.ok(pack.nextResearchActions.includes("Quantify impact of missed escalations."));
  });

  it("generates validation questions only from evidence gaps", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.equal(pack.validationQuestions.length, pack.evidenceGaps.length);
    assert.ok(pack.validationQuestions.includes("Who owns budget for solving this workflow?"));
    assert.ok(pack.validationQuestions.includes("How often does this workflow occur?"));
    assert.equal(
      pack.validationQuestions.includes(
        "Are current tools failing due to workflow complexity rather than preference?",
      ),
      false,
    );
  });

  it("merges gaps, questions, actions, and upgrade impact into validation plan items", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.equal(pack.validationPlan.length, pack.evidenceGaps.length);
    assert.deepEqual(
      pack.validationPlan.map((item) => item.questionToAnswer),
      pack.validationQuestions,
    );
    assert.ok(
      pack.validationPlan.every(
        (item) =>
          item.validationItem.length > 0 &&
          item.whyItMatters.length > 0 &&
          item.questionToAnswer.length > 0 &&
          item.expectedConfidenceGain.length > 0,
      ),
    );
    assert.ok(
      pack.validationPlan.some(
        (item) =>
          item.validationItem === "Confirm budget owner" &&
          item.questionToAnswer === "Who owns budget for solving this workflow?" &&
          item.expectedConfidenceGain === "High",
      ),
    );
  });

  it("keeps upgrade plan focused on missing evidence", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    const gapLabels = pack.evidenceGaps.map((gap) => gap.label);

    assert.ok(
      pack.evidenceUpgradePlan.steps.every((step) =>
        gapLabels.some((label) => step.endsWith(label)),
      ),
    );
    assert.ok(pack.evidenceUpgradePlan.steps.includes("+2 score -> Budget owner confirmation"));
    assert.ok(pack.evidenceUpgradePlan.steps.includes("+1 score -> Quantified manual effort"));
  });

  it("keeps evidence gap descriptions concise", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates month-end close delays.",
    });

    assert.ok(
      pack.evidenceGaps.every(
        (gap) => gap.whyItMatters.length <= 80 && gap.evidenceNeeded.length <= 80,
      ),
    );
  });

  it("still renders useful copy when buyer and economic owner are missing", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.ok(pack.validationQuestions.length > 0);
    assert.ok(pack.nextResearchActions.length > 0);
    assert.ok(pack.evidenceUpgradePlan.steps.includes("+2 score -> Budget owner confirmation"));
  });

  it("clears upgrade tasks when evidence target is achieved", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      rawText:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping because mismatches take manual follow-up.",
      pain: "Finance reconciliation slows month-end close.",
      urgency: "high",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches and month-end close delays.",
      monetizationScore: 8,
    });

    assert.equal(pack.evidenceUpgradePlan.currentScore >= pack.evidenceUpgradePlan.targetScore, true);
    assert.deepEqual(pack.evidenceUpgradePlan.steps, []);
    assert.equal(pack.evidenceUpgradePlan.message, "Evidence target achieved.");
  });

  it("hides validation path when evidence target is achieved", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      rawText:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping because mismatches take manual follow-up.",
      urgency: "high",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches and month-end close delays.",
      monetizationScore: 8,
    });

    assert.deepEqual(pack.nextResearchActions, []);
  });

  it("hides validation path when evidence score is at least 8", () => {
    const pack = generateEvidencePack({
      affectedTeam: "Operations",
      evidenceAnalysis: {
        evidenceStrength: "high",
        evidenceScore: 8,
        evidenceReasons: [],
      },
    });

    assert.deepEqual(pack.nextResearchActions, []);
  });

  it("renders a research summary", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });

    assert.ok(pack.researchSummary.length > 0);
    assert.deepEqual(
      pack.researchSummary.split("\n").map((line) => line.split(":")[0]),
      ["Problem", "Impact", "Unknowns"],
    );
    assert.equal(pack.researchSummary.includes("Strong evidence suggests"), false);
    assert.equal(pack.researchSummary.includes("Remaining uncertainty centers on"), false);
  });

  it("orders evidence drivers before known evidence in the pack shape", () => {
    const pack = buildPack({
      name: "Support escalation spreadsheet",
      frequency: "unknown",
      affectedTeam: "Support",
      currentSolution: "Zendesk + Spreadsheets",
      solutionGap: "Ownership may be unclear.",
    });
    const keys = Object.keys(pack);

    assert.ok(keys.indexOf("evidenceDrivers") < keys.indexOf("currentEvidence"));
  });

  it("does not show weaknesses for 10 out of 10 evidence", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      rawText:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping because mismatches take manual follow-up.",
      urgency: "high",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches and month-end close delays.",
      monetizationScore: 8,
    });

    assert.equal(pack.evidenceUpgradePlan.currentScore, 10);
    assert.deepEqual(pack.evidenceDrivers.negative, []);
  });

  it("categorizes known evidence", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates month-end close delays.",
    });
    const categoryLabels = pack.evidenceCategories.map((category) => category.label);

    assert.ok(categoryLabels.includes("Workflow Evidence"));
    assert.ok(categoryLabels.includes("System Evidence"));
    assert.ok(categoryLabels.includes("Business Evidence"));
    assert.ok(categoryLabels.includes("Ownership Evidence"));
  });

  it("marks achieved evidence status correctly", () => {
    const pack = buildPack({
      name: "Finance reconciliation",
      rawText:
        "Every Friday finance exports Stripe payouts into NetSuite and spreadsheets. Month-end close keeps slipping because mismatches take manual follow-up.",
      urgency: "high",
      frequency: "weekly",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Spreadsheets",
      solutionGap: "Manual reconciliation creates mismatches and month-end close delays.",
      monetizationScore: 8,
    });

    assert.equal(pack.evidenceUpgradePlan.status, "achieved");
    assert.equal(pack.evidenceUpgradePlan.message, "Evidence target achieved.");
  });
});
