import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildInterviewCreateInput,
  buildOpportunityDiscoveryUpdate,
  getInterviewCount,
  isInterviewStatus,
  parseFounderConviction,
} from "./opportunity-validation.ts";

describe("opportunity discovery update fields", () => {
  it("persists frequency, current solution, solution gap, and founder conviction", () => {
    const update = buildOpportunityDiscoveryUpdate({
      frequency: " weekly ",
      currentSolution: " spreadsheets ",
      solutionGap: " no visibility ",
      founderConviction: 8,
    });

    assert.deepEqual(update, {
      frequency: "weekly",
      currentSolution: "spreadsheets",
      solutionGap: "no visibility",
      founderConviction: 8,
    });
  });
});

describe("founder conviction validation", () => {
  it("accepts values from 1 to 10", () => {
    for (let score = 1; score <= 10; score += 1) {
      assert.equal(parseFounderConviction(score), score);
    }
  });

  it("rejects values below 1", () => {
    assert.throws(() => parseFounderConviction(0));
  });

  it("rejects values above 10", () => {
    assert.throws(() => parseFounderConviction(11));
  });
});

describe("interview validation and counting", () => {
  it("accepts allowed interview statuses", () => {
    assert.equal(isInterviewStatus("scheduled"), true);
    assert.equal(isInterviewStatus("completed"), true);
    assert.equal(isInterviewStatus("cancelled"), true);
  });

  it("rejects invalid interview statuses", () => {
    assert.equal(isInterviewStatus("notes"), false);
    assert.throws(() =>
      buildInterviewCreateInput({
        opportunityId: "pain-1",
        status: "notes",
      }),
    );
  });

  it("creates interview input attached to an opportunity", () => {
    const interview = buildInterviewCreateInput({
      opportunityId: "pain-1",
      contactName: " Ada ",
      company: " ExampleCo ",
      title: " COO ",
      status: "scheduled",
      notes: " Discovery call ",
    });

    assert.deepEqual(interview, {
      opportunityId: "pain-1",
      contactName: "Ada",
      company: "ExampleCo",
      title: "COO",
      status: "scheduled",
      notes: "Discovery call",
    });
  });

  it("counts interviews safely", () => {
    assert.equal(getInterviewCount(3), 3);
    assert.equal(getInterviewCount(null), 0);
    assert.equal(getInterviewCount(undefined), 0);
  });
});
