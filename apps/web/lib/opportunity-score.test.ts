import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateOpportunityScore } from "./opportunity-score.ts";

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
});
