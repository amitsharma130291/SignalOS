import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOpportunityScore, getAutomationPotentialBonus } from "./opportunity-score.ts";

describe("calculateOpportunityScore", () => {
  it("returns a high score for strong B2B, high monetization, high urgency opportunities", () => {
    const result = calculateOpportunityScore({
      b2bScore: 8,
      monetizationScore: 9,
      urgency: "high",
      targetTitles: ["RevOps Manager"],
      rawInputStatus: "accepted",
    });

    assert.equal(result.label, "high");
    assert.ok(result.score >= 70);
    assert.ok(result.reasons.length > 0);
  });

  it("returns medium score for partial data", () => {
    const result = calculateOpportunityScore({
      b2bScore: 4,
      monetizationScore: 4,
      urgency: "medium",
    });

    assert.equal(result.label, "medium");
    assert.ok(result.score >= 40);
    assert.ok(result.score < 70);
  });

  it("returns low score for weak low-urgency data", () => {
    const result = calculateOpportunityScore({
      b2bScore: 1,
      monetizationScore: 1,
      urgency: "low",
    });

    assert.equal(result.label, "low");
    assert.ok(result.score < 40);
  });

  it("never exceeds 100", () => {
    const result = calculateOpportunityScore({
      b2bScore: 999,
      monetizationScore: 999,
      urgency: "high",
      targetTitles: ["VP Sales"],
      rawInputStatus: "accepted",
      status: "approved",
    });

    assert.equal(result.score, 100);
  });

  it("never goes below 0 and always returns reasons", () => {
    const result = calculateOpportunityScore({
      b2bScore: -999,
      monetizationScore: -999,
      urgency: "low",
    });

    assert.equal(result.score, 0);
    assert.ok(result.reasons.length > 0);
  });

  it("scores Finance Stripe and NetSuite reconciliation above Operations compliance", () => {
    const finance = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Finance Ops",
      frequency: "weekly",
      currentSolution: "NetSuite + Stripe + Spreadsheets",
      solutionGap:
        "Manual reconciliation and cross-checking create mismatches, exception tracking, reporting delays, and month-end close delays.",
      rawText:
        "Every Friday our finance team exports Stripe payouts into NetSuite and then manually updates a spreadsheet to investigate mismatches. The process takes half a day and month-end close keeps slipping.",
    });
    const operations = calculateOpportunityScore({
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
    });

    assert.equal(finance.label, "high");
    assert.ok(finance.score >= 75);
    assert.ok(finance.score > operations.score);
    assert.ok(operations.score <= 85);
    assert.ok(operations.score >= 60);
  });

  it("keeps low urgency Support escalation below 60", () => {
    const support = calculateOpportunityScore({
      b2bScore: 2,
      monetizationScore: 4,
      urgency: "low",
      rawInputStatus: "accepted",
      affectedTeam: "Support",
      frequency: "daily",
      currentSolution: "Zendesk + Slack + Spreadsheets",
      solutionGap:
        "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
      rawText:
        "Support agents copy Zendesk tickets into Slack channels to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.",
    });

    assert.ok(support.score < 60);
  });

  it("keeps calibrated scores clamped to 0-100", () => {
    const high = calculateOpportunityScore({
      b2bScore: 999,
      monetizationScore: 999,
      urgency: "high",
      rawInputStatus: "accepted",
      affectedTeam: "Finance Ops",
      currentSolution: "Stripe + NetSuite + Salesforce + HubSpot + Spreadsheets",
      solutionGap:
        "Manual reconciliation creates mismatches, reporting delays, month-end close delays, and forecast accuracy issues.",
      rawText:
        "Finance exports Stripe payouts into NetSuite and spreadsheets for half a day while month-end close keeps slipping.",
      targetTitles: ["VP Finance"],
      icpGeneratedAt: new Date(),
      status: "approved",
    });

    assert.equal(high.score, 100);
  });

  it("maps automation potential to score bonuses", () => {
    assert.equal(getAutomationPotentialBonus("High"), 5);
    assert.equal(getAutomationPotentialBonus("Medium"), 2);
    assert.equal(getAutomationPotentialBonus("Low"), 0);
    assert.equal(getAutomationPotentialBonus("Unknown"), 0);
  });

  it("adds high automation potential bonus and reason", () => {
    const result = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "high",
      rawInputStatus: "accepted",
      automationPotential: "High",
    });

    assert.ok(result.reasons.includes("High automation potential added 5 points."));
  });

  it("adds medium automation potential bonus and reason", () => {
    const medium = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
      automationPotential: "Medium",
    });
    const low = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
      automationPotential: "Low",
    });

    assert.equal(medium.score, low.score + 2);
    assert.ok(medium.reasons.includes("Medium automation potential added 2 points."));
  });

  it("applies evidence strength modifiers after existing score logic", () => {
    const base = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
    });
    const high = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
      evidenceStrength: "high",
    });
    const medium = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
      evidenceStrength: "medium",
    });
    const low = calculateOpportunityScore({
      b2bScore: 3,
      monetizationScore: 3,
      urgency: "medium",
      rawInputStatus: "accepted",
      evidenceStrength: "low",
    });

    assert.equal(high.score, base.score + 5);
    assert.equal(medium.score, base.score);
    assert.equal(low.score, base.score - 5);
    assert.ok(high.reasons.includes("High evidence strength added 5 points."));
    assert.ok(low.reasons.includes("Low evidence strength reduced score by 5 points."));
  });

  it("clamps high evidence modifier at 100", () => {
    const result = calculateOpportunityScore({
      b2bScore: 999,
      monetizationScore: 999,
      urgency: "high",
      rawInputStatus: "accepted",
      targetTitles: ["VP Finance"],
      evidenceStrength: "high",
    });

    assert.equal(result.score, 100);
  });
});
