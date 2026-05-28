import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getReviewEditFeedback,
  getNextOpenEditId,
  getReviewCardClassName,
  getSavedReviewIdAfterSave,
  shouldCollapseReviewEditForm,
  shouldShowReviewSavedFeedback,
} from "./review-edit-form-state.ts";

describe("review edit form state", () => {
  it("collapses only after successful save", () => {
    assert.equal(shouldCollapseReviewEditForm({ status: "success" }), true);
    assert.equal(shouldCollapseReviewEditForm({ status: "error" }), false);
    assert.equal(shouldCollapseReviewEditForm({ status: "idle" }), false);
  });

  it("returns success and error feedback", () => {
    assert.equal(getReviewEditFeedback({ status: "success" }), null);
    assert.equal(
      getReviewEditFeedback({ status: "error", message: "Save failed" }),
      "Save failed",
    );
  });

  it("opens the correct card edit form", () => {
    assert.equal(getNextOpenEditId(null, "pain-a"), "pain-a");
    assert.equal(getNextOpenEditId("pain-a", "pain-b"), "pain-b");
  });

  it("clicking the same edit button closes the card form", () => {
    assert.equal(getNextOpenEditId("pain-a", "pain-a"), null);
  });

  it("saving closes the correct form and marks the saved card", () => {
    const savedReviewId = getSavedReviewIdAfterSave("pain-a");
    const nextOpenEditId = null;

    assert.equal(nextOpenEditId, null);
    assert.equal(shouldShowReviewSavedFeedback("pain-a", savedReviewId), true);
    assert.equal(shouldShowReviewSavedFeedback("pain-b", savedReviewId), false);
  });

  it("human edited cards do not get temporary highlight classes", () => {
    assert.equal(getReviewCardClassName(true), getReviewCardClassName(false));
    assert.equal(getReviewCardClassName(true).includes("emerald"), false);
  });
});
