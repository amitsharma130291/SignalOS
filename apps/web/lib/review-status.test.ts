import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMessageReviewStatus,
  isReviewStatus,
  MESSAGE_REVIEW_STATUSES,
  REVIEW_STATUSES,
} from "./review-status.ts";

describe("review status validation", () => {
  it("accepts allowed pain signal statuses", () => {
    for (const status of REVIEW_STATUSES) {
      assert.equal(isReviewStatus(status), true);
    }
  });

  it("rejects invalid pain signal statuses", () => {
    assert.equal(isReviewStatus("draft"), false);
    assert.equal(isReviewStatus("queued"), false);
    assert.equal(isReviewStatus("sent"), false);
  });

  it("accepts allowed message statuses", () => {
    for (const status of MESSAGE_REVIEW_STATUSES) {
      assert.equal(isMessageReviewStatus(status), true);
    }
  });

  it("rejects invalid message statuses", () => {
    assert.equal(isMessageReviewStatus("new"), false);
    assert.equal(isMessageReviewStatus("queued"), false);
    assert.equal(isMessageReviewStatus("sent"), false);
  });
});
