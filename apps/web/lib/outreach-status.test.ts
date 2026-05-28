import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOutreachDraftStatus, OUTREACH_DRAFT_STATUSES } from "./outreach-status.ts";

describe("outreach draft status validation", () => {
  it("accepts allowed statuses", () => {
    for (const status of OUTREACH_DRAFT_STATUSES) {
      assert.equal(isOutreachDraftStatus(status), true);
    }
  });

  it("rejects invalid statuses", () => {
    assert.equal(isOutreachDraftStatus("sent"), false);
    assert.equal(isOutreachDraftStatus("queued"), false);
    assert.equal(isOutreachDraftStatus("approved"), false);
  });
});
