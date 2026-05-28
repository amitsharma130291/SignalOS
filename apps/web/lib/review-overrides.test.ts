import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMessageReviewDecisionUpdate,
  buildPainSignalReviewDecisionUpdate,
  preferHumanValue,
} from "./review-overrides.ts";

describe("human override logic", () => {
  it("uses human pain when present", () => {
    assert.equal(preferHumanValue("Edited pain", "Generated pain"), "Edited pain");
  });

  it("falls back to generated pain when human pain is missing", () => {
    assert.equal(preferHumanValue("", "Generated pain"), "Generated pain");
    assert.equal(preferHumanValue(null, "Generated pain"), "Generated pain");
  });

  it("uses human subject when present", () => {
    assert.equal(preferHumanValue("Edited subject", "Generated subject"), "Edited subject");
  });

  it("falls back to generated subject when human subject is missing", () => {
    assert.equal(preferHumanValue(undefined, "Generated subject"), "Generated subject");
  });
});

describe("review action update builders", () => {
  it("approve sets approved and reviewedAt", () => {
    const reviewedAt = new Date("2026-05-28T00:00:00.000Z");
    const update = buildPainSignalReviewDecisionUpdate("approved", "Looks good", reviewedAt);

    assert.equal(update.status, "approved");
    assert.equal(update.reviewedAt, reviewedAt);
    assert.equal(update.humanNotes, "Looks good");
  });

  it("reject sets rejected and persists notes", () => {
    const update = buildMessageReviewDecisionUpdate("rejected", "Wrong target");

    assert.equal(update.status, "rejected");
    assert.equal(update.reviewNotes, "Wrong target");
    assert.ok(update.reviewedAt instanceof Date);
  });

  it("flag bad angle sets status and angle feedback", () => {
    const update = buildPainSignalReviewDecisionUpdate("bad_angle", "Angle is too broad");

    assert.equal(update.status, "bad_angle");
    assert.equal(update.angleFeedback, "bad_angle");
    assert.equal(update.humanNotes, "Angle is too broad");
  });
});
