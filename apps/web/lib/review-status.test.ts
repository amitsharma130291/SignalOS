import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isReviewStatus, REVIEW_STATUSES } from "./review-status.ts";

describe("review status validation", () => {
  it("accepts allowed statuses", () => {
    for (const status of REVIEW_STATUSES) {
      assert.equal(isReviewStatus(status), true);
    }
  });

  it("rejects invalid statuses", () => {
    assert.equal(isReviewStatus("queued"), false);
    assert.equal(isReviewStatus("sent"), false);
    assert.equal(isReviewStatus(""), false);
    assert.equal(isReviewStatus(null), false);
  });
});
