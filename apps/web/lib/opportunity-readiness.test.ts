import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateBuyerMapping } from "./buyer-mapping-engine.ts";
import { generateEvidenceStrength } from "./evidence-strength.ts";
import { generateEvidencePack } from "./evidence-pack-generator.ts";
import { generateOpportunityReadiness } from "./opportunity-readiness.ts";
import { generateSolutionGapAnalysis } from "./solution-gap-engine.ts";

type ReadinessFixture = {
  rawText: string;
  pain: string;
  affectedTeam?: string;
  frequency?: string;
  currentSolution?: string;
  solutionGap?: string;
  buyer?: string;
  budgetOwner?: string;
  outreachAngle?: string;
};

function buildReadiness(fixture: ReadinessFixture) {
  const solutionGapAnalysis = generateSolutionGapAnalysis({
    rawText: fixture.rawText,
    pain: fixture.pain,
    affectedTeam: fixture.affectedTeam,
    currentSolution: fixture.currentSolution,
    solutionGap: fixture.solutionGap,
  });
  const evidenceAnalysis = generateEvidenceStrength({
    title: fixture.pain,
    summary: fixture.rawText,
    affected_team: fixture.affectedTeam,
    frequency: fixture.frequency,
    current_solution: fixture.currentSolution,
    solution_gap: fixture.solutionGap,
  });
  const buyerMapping = generateBuyerMapping({
    narrative: fixture.rawText,
    pain: fixture.pain,
    affectedTeam: fixture.affectedTeam,
    currentSolution: fixture.currentSolution,
    solutionGap: fixture.solutionGap,
    businessImpact: solutionGapAnalysis.businessImpact,
  });
  const evidencePack = generateEvidencePack({
    rawText: fixture.rawText,
    pain: fixture.pain,
    affectedTeam: fixture.affectedTeam,
    frequency: fixture.frequency,
    currentSolution: fixture.currentSolution,
    solutionGap: fixture.solutionGap,
    evidenceAnalysis,
    buyerMapping,
  });

  return generateOpportunityReadiness({
    ...fixture,
    evidenceAnalysis,
    evidencePack,
    buyerMapping,
    solutionGapAnalysis,
  });
}

describe("generateOpportunityReadiness", () => {
  it("classifies sparse opportunities as Discover", () => {
    const readiness = buildReadiness({
      rawText: "A team mentioned manual operational work but did not give workflow details.",
      pain: "Manual operational work",
    });

    assert.equal(readiness.stage, "Discover");
    assert.ok(readiness.completedMilestones <= 2);
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Buyer Path"));
    assert.ok(readiness.blockers.some((blocker) => blocker.blockerLabel === "Buyer Path Missing"));
    assert.equal(readiness.trustedFields.buyer.trustState, "missing");
    assert.notEqual(readiness.nextBestAction, "Generate reviewed outreach draft.");
  });

  it("classifies partially qualified opportunities as Validate", () => {
    const readiness = buildReadiness({
      rawText:
        "Support managers review Zendesk escalations weekly in Slack and spreadsheets because missed escalations create response delays.",
      pain: "Support escalations are tracked manually",
      affectedTeam: "Support",
      frequency: "weekly",
      currentSolution: "Zendesk + Slack + spreadsheets",
      solutionGap: "Manual escalation tracking creates missed escalations and response delays.",
    });

    assert.equal(readiness.stage, "Validate");
    assert.equal(readiness.completedMilestones, 3);
    assert.equal(
      readiness.milestones.find((milestone) => milestone.name === "Workflow")?.trustState,
      "validated",
    );
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Buyer Path"));
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Economic Case"));
    assert.ok(readiness.blockers.some((blocker) => blocker.blockerLabel === "Buyer Path Missing"));
    assert.ok(readiness.blockers.some((blocker) => blocker.blockerLabel === "Budget Owner Missing"));
    assert.equal(readiness.nextBestAction, "Identify pain owner and buyer path.");
  });

  it("classifies fully qualified opportunities as Outreach Ready", () => {
    const readiness = buildReadiness({
      rawText:
        "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
      pain: "Finance reconciliation delays month-end close",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap:
        "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
      buyer: "Controller",
      budgetOwner: "CFO",
      outreachAngle: "Reduce manual reconciliation effort before close.",
    });

    assert.equal(readiness.stage, "Outreach Ready");
    assert.equal(readiness.completedMilestones, 5);
    assert.deepEqual(readiness.blockers, []);
    assert.equal(readiness.nextBestAction, "Generate reviewed outreach draft.");
    assert.equal(readiness.buyerPath.evaluator, "Controller");
    assert.equal(readiness.buyerPath.budgetOwner, "CFO");
    assert.equal(readiness.trustedFields.economicCase.trustState, "validated");
  });

  it("does not validate or complete economic case when budget or cost evidence is missing", () => {
    const readiness = buildReadiness({
      rawText:
        "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools and the CFO owns budget. Month-end close is delayed.",
      pain: "Finance reconciliation delays month-end close",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap: "Manual reconciliation creates month-end close delays.",
      buyer: "Controller",
      budgetOwner: "CFO",
    });
    const economicCase = readiness.milestones.find(
      (milestone) => milestone.name === "Economic Case",
    );

    assert.notEqual(readiness.trustedFields.economicCase.trustState, "validated");
    assert.equal(economicCase?.detail, "Budget and cost evidence needed");
    assert.equal(economicCase?.complete, false);
    assert.equal(readiness.completedMilestones, 4);
    assert.ok(
      readiness.blockers.some((blocker) => blocker.blockerLabel === "Economic Case Inferred"),
    );
    assert.equal(readiness.nextBestAction, "Validate budget and cost impact.");
  });

  it("uses business impact not validated wording and action", () => {
    const readiness = buildReadiness({
      rawText: "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets.",
      pain: "Finance reconciliation is manual",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap: "Manual reconciliation requires follow-up.",
      buyer: "Controller",
      budgetOwner: "CFO",
    });

    assert.ok(
      readiness.blockers.some((blocker) => blocker.blockerLabel === "Business Impact Inferred"),
    );
    assert.equal(readiness.nextBestAction, "Quantify business impact.");
  });

  it("counts only validated and human-confirmed milestones as complete", () => {
    const readiness = generateOpportunityReadiness({
      rawText:
        "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates the workflow and the CFO owns budget, but cost impact is estimated.",
      pain: "Finance reconciliation delays month-end close",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap: "Manual reconciliation creates estimated month-end close delays.",
      buyer: "Controller",
      budgetOwner: "CFO",
      evidenceAnalysis: {
        evidenceStrength: "high",
        evidenceScore: 8,
        evidenceReasons: ["explicit frequency", "explicit workflow", "explicit business impact"],
      },
      evidencePack: {
        researchSummary: "",
        evidenceDrivers: { positive: [], negative: [] },
        currentEvidence: { known: [] },
        evidenceCategories: [
          { label: "Workflow Evidence", items: ["daily reconciliation process"] },
          { label: "Business Evidence", items: ["Month-end close delays"] },
        ],
        evidenceGaps: [],
        validationPlan: [],
        validationQuestions: [],
        nextResearchActions: [],
        evidenceUpgradePlan: {
          currentScore: 8,
          targetScore: 10,
          steps: [],
          status: "needs_validation",
          message: "Additional validation required.",
        },
      },
      buyerMapping: {
        user: "Finance Analyst",
        buyer: "Controller",
        champion: "Finance Manager",
        economicOwner: "CFO",
        department: "Finance",
        companySizeFit: ["Mid Market", "Enterprise"],
        buyerClarityScore: 10,
        buyerClarityReasons: [],
        buyingCommittee: ["Finance Analyst", "Controller", "CFO"],
        decisionMap: {
          suffers: "Finance Analyst",
          champion: "Finance Manager",
          buyer: "Controller",
          pays: "CFO",
          economicBuyer: "CFO",
        },
      },
      solutionGapAnalysis: {
        currentSolution: "Stripe + NetSuite",
        failureModes: ["reconciliation mismatches"],
        rootCause: "Data spread across finance systems and spreadsheets.",
        businessImpact: "Month-end close delays and reporting risk.",
        automationPotential: "High",
      },
      humanConfirmedFields: {
        buyer: true,
      },
    });
    const completedByTrust = readiness.milestones.filter((milestone) =>
      ["validated", "human_confirmed"].includes(milestone.trustState),
    ).length;

    assert.equal(readiness.completedMilestones, completedByTrust);
    assert.ok(readiness.milestones.some((milestone) => milestone.trustState === "human_confirmed"));
    assert.equal(
      readiness.milestones.some(
        (milestone) =>
          milestone.complete &&
          (milestone.trustState === "missing" || milestone.trustState === "inferred"),
      ),
      false,
    );
  });

  it("does not expose contradictory milestone names", () => {
    const readiness = buildReadiness({
      rawText: "A team mentioned manual operational work but did not give workflow details.",
      pain: "Manual operational work",
    });

    assert.equal(
      readiness.milestones.some((milestone) => milestone.name.includes("Identified")),
      false,
    );
    assert.equal(
      readiness.milestones.some(
        (milestone) =>
          milestone.trustState === "missing" && milestone.detail.toLowerCase() === "unknown",
      ),
      false,
    );
  });

  it("keeps readiness stages unchanged while adding human-confirmed trust", () => {
    const readiness = buildReadiness({
      rawText:
        "Finance analysts reconcile Stripe payouts with NetSuite every day through spreadsheets. The Controller evaluates finance workflow tools, the CFO owns budget, and the process takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
      pain: "Finance reconciliation delays month-end close",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap:
        "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
      buyer: "Controller",
      budgetOwner: "CFO",
      outreachAngle: "Reduce manual reconciliation effort before close.",
    });

    const confirmedReadiness = generateOpportunityReadiness({
      pain: "Finance reconciliation delays month-end close",
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolution: "Stripe + NetSuite + spreadsheets",
      solutionGap:
        "Manual reconciliation takes 12 hours per week, creates audit risk cost, and causes month-end close delays.",
      buyer: "Controller",
      budgetOwner: "CFO",
      outreachAngle: "Reduce manual reconciliation effort before close.",
      evidenceAnalysis: {
        evidenceStrength: "high",
        evidenceScore: 10,
        evidenceReasons: ["explicit frequency", "explicit workflow", "explicit business impact"],
      },
      evidencePack: {
        researchSummary: "",
        evidenceDrivers: { positive: [], negative: [] },
        currentEvidence: { known: [] },
        evidenceCategories: [
          { label: "Workflow Evidence", items: ["daily reconciliation process"] },
          { label: "Business Evidence", items: ["Month-end close delays"] },
        ],
        evidenceGaps: [],
        validationPlan: [],
        validationQuestions: [],
        nextResearchActions: [],
        evidenceUpgradePlan: {
          currentScore: 10,
          targetScore: 10,
          steps: [],
          status: "achieved",
          message: "Evidence target achieved.",
        },
      },
      buyerMapping: {
        user: "Finance Analyst",
        buyer: "Controller",
        champion: "Finance Manager",
        economicOwner: "CFO",
        department: "Finance",
        companySizeFit: ["Mid Market", "Enterprise"],
        buyerClarityScore: 10,
        buyerClarityReasons: [],
        buyingCommittee: ["Finance Analyst", "Controller", "CFO"],
        decisionMap: {
          suffers: "Finance Analyst",
          champion: "Finance Manager",
          buyer: "Controller",
          pays: "CFO",
          economicBuyer: "CFO",
        },
      },
      solutionGapAnalysis: {
        currentSolution: "Stripe + NetSuite",
        failureModes: ["reconciliation mismatches"],
        rootCause: "Data spread across finance systems and spreadsheets.",
        businessImpact: "Month-end close delays and reporting risk.",
        automationPotential: "High",
      },
      humanConfirmedFields: {
        buyer: true,
      },
    });

    assert.equal(confirmedReadiness.stage, readiness.stage);
    assert.equal(confirmedReadiness.trustedFields.buyer.trustState, "human_confirmed");
  });
});
