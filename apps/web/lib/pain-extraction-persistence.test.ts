import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildPainSignalExtractionWrite } from "./pain-extraction-persistence.ts";
import { mockPainExtractor } from "./mockPainExtractor.ts";

describe("pain extraction persistence", () => {
  it("saves frequency, current solution, and solution gap", () => {
    const extraction = mockPainExtractor(
      "Finance reconciles NetSuite records in spreadsheets every week, creating reporting delays.",
    );
    const write = buildPainSignalExtractionWrite(extraction);

    assert.equal(write.frequency, "weekly");
    assert.equal(write.currentSolution, "NetSuite + Spreadsheets");
    assert.equal(write.solutionGap, "Manual reconciliation creates cleanup work and reporting delays.");
  });

  it("does not include human overrides, founder conviction, interviews, or review notes", () => {
    const extraction = mockPainExtractor("Team coordinates approvals manually.");
    const write = buildPainSignalExtractionWrite(extraction);

    assert.equal("humanPain" in write, false);
    assert.equal("humanOutreachAngle" in write, false);
    assert.equal("founderConviction" in write, false);
    assert.equal("interviews" in write, false);
    assert.equal("humanNotes" in write, false);
    assert.equal("reviewedAt" in write, false);
  });
});
