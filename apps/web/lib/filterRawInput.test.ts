import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterRawInput,
  matchesKeyword,
  matchWeightedKeywords,
  NEGATIVE_KEYWORD_WEIGHTS,
} from "./filterRawInput.ts";

describe("keyword matching", () => {
  it("matches whole words case-insensitively", () => {
    assert.equal(matchesKeyword("CRM workflow pain", "crm"), true);
    assert.equal(matchesKeyword("CRM workflow pain", "workflow"), true);
  });

  it("does not match substrings inside larger words", () => {
    assert.equal(matchesKeyword("updating CRM fields manually", "dating"), false);

    const negative = matchWeightedKeywords("updating CRM fields manually", NEGATIVE_KEYWORD_WEIGHTS);
    assert.equal(negative.matched.includes("dating"), false);
    assert.equal(negative.total, 0);
  });

  it("matches simple plural variants without naive substring matching", () => {
    assert.equal(matchesKeyword("manual reporting handoffs", "handoff"), true);
    assert.equal(matchesKeyword("spreadsheet workflows", "workflow"), true);
  });
});

describe("filter scoring and classification", () => {
  it("accepts strong operational B2B signals with high confidence", () => {
    const result = filterRawInput(
      "Sales reps waste hours updating CRM fields manually after every customer call.",
    );

    assert.equal(result.status, "accepted");
    assert.equal(result.marketType, "b2b");
    assert.equal(result.confidence, "high");
    assert.equal(result.b2cScore, 0);
    assert.ok(result.operationalScore >= 5);
    assert.ok(result.b2bScore > result.b2cScore);
    assert.ok(result.matchedB2BKeywords.includes("crm"));
    assert.ok(result.matchedB2BKeywords.includes("sales reps"));
    assert.equal(result.matchedNegativeKeywords.includes("dating"), false);
  });

  it("keeps weak operational hints in needs_review with medium confidence", () => {
    const result = filterRawInput("We have support challenges on the team.");

    assert.equal(result.status, "needs_review");
    assert.equal(result.marketType, "unknown");
    assert.equal(result.confidence, "medium");
    assert.equal(result.operationalScore, 2);
    assert.equal(result.b2bScore, 0);
    assert.equal(result.b2cScore, 0);
  });

  it("filters obvious B2C consumer/lifestyle signals with high confidence", () => {
    const result = filterRawInput("Fitness social media app for influencers.");

    assert.equal(result.status, "filtered_out");
    assert.equal(result.marketType, "b2c");
    assert.equal(result.confidence, "high");
    assert.ok(result.b2cScore > result.b2bScore);
    assert.ok(result.matchedB2CKeywords.includes("fitness"));
    assert.ok(result.matchedB2CKeywords.includes("social media"));
  });

  it("accumulates multiple B2B keyword scores", () => {
    const result = filterRawInput(
      "Manual spreadsheet CRM workflow with repetitive sales ops reporting handoffs.",
    );

    assert.equal(result.status, "accepted");
    assert.equal(result.marketType, "b2b");
    assert.equal(result.confidence, "high");
    assert.ok(result.b2bScore >= 10);
    assert.ok(result.matchedB2BKeywords.includes("crm"));
    assert.ok(result.matchedB2BKeywords.includes("sales ops"));
    assert.ok(result.matchedB2BKeywords.includes("workflow"));
    assert.ok(result.matchedB2BKeywords.includes("spreadsheet"));
    assert.ok(result.matchedB2BKeywords.includes("reporting"));
    assert.ok(result.matchedB2BKeywords.includes("handoff"));
  });
});
