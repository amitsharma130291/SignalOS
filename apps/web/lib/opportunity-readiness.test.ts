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
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Buyer Path Identified"));
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
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Buyer Path Identified"));
    assert.ok(readiness.blockers.some((blocker) => blocker.name === "Economic Case Identified"));
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
  });
});
