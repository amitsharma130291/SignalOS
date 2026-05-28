import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shapeReviewQueueItem } from "./review-queue.ts";

describe("shapeReviewQueueItem", () => {
  it("handles a missing message without crashing", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      status: "new",
    });

    assert.equal(item.message, null);
    assert.equal(item.pain, "Generated pain");
  });

  it("falls back safely when ICP fields are missing", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
    });

    assert.deepEqual(item.targetTitles, []);
    assert.equal(item.companySize, "Unknown");
    assert.equal(item.buyer, "Unknown");
  });

  it("prefers human pain and message overrides", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      humanPain: "Human pain",
      messages: [
        {
          id: "message-1",
          subject: "Generated subject",
          body: "Generated body",
          status: "draft",
          humanSubject: "Human subject",
          humanBody: "Human body",
        },
      ],
    });

    assert.equal(item.pain, "Human pain");
    assert.equal(item.message?.subject, "Human subject");
    assert.equal(item.message?.body, "Human body");
    assert.equal(item.hasHumanEdits, true);
  });

  it("marks human pain as edited", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      humanPain: "Human pain",
    });

    assert.equal(item.hasHumanEdits, true);
  });

  it("marks human message body as edited", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      messages: [
        {
          id: "message-1",
          body: "Generated body",
          humanBody: "Human body",
        },
      ],
    });

    assert.equal(item.hasHumanEdits, true);
  });

  it("does not mark generated-only records as edited", () => {
    const item = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      messages: [
        {
          id: "message-1",
          body: "Generated body",
        },
      ],
    });

    assert.equal(item.hasHumanEdits, false);
  });

  it("marks notes and angle feedback as edited", () => {
    const notesItem = shapeReviewQueueItem({
      id: "pain-1",
      pain: "Generated pain",
      humanNotes: "Needs better targeting",
    });
    const feedbackItem = shapeReviewQueueItem({
      id: "pain-2",
      pain: "Generated pain",
      angleFeedback: "bad_angle",
    });

    assert.equal(notesItem.hasHumanEdits, true);
    assert.equal(feedbackItem.hasHumanEdits, true);
  });
});
