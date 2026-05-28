import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shapeOpportunity } from "./opportunity-dashboard.ts";

describe("shapeOpportunity", () => {
  it("handles missing ICP fields gracefully", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Manual reporting handoffs",
      status: "new",
      rawInput: {
        rawText: "Manual spreadsheet reporting handoffs",
        status: "accepted",
        metadata: {
          filter: {
            marketType: "b2b",
            confidence: "high",
          },
        },
      },
    });

    assert.equal(opportunity.companySize, "Unknown");
    assert.equal(opportunity.industry, "Unknown");
    assert.deepEqual(opportunity.targetTitles, []);
    assert.equal(opportunity.icpGenerated, false);
    assert.equal(opportunity.rawSignalText, "Manual spreadsheet reporting handoffs");
  });

  it("handles missing raw input gracefully", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
      pain: "Manual reporting handoffs",
      status: "interesting",
    });

    assert.equal(opportunity.rawSignalText, "Raw input unavailable");
    assert.equal(opportunity.filterStatus, "unknown");
    assert.equal(opportunity.marketType, "unknown");
    assert.equal(opportunity.reviewStatus, "interesting");
  });

  it("does not produce undefined values for missing optional fields", () => {
    const opportunity = shapeOpportunity({
      id: "pain-1",
    });

    assert.equal(
      Object.values(opportunity).some((value) => value === undefined),
      false,
    );
  });
});
