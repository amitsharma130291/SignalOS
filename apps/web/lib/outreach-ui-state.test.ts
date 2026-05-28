import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  shouldShowGenerateOutreachDraftButton,
  shouldShowHumanEditedBadge,
  shouldShowRegenerateOutreachDraftButton,
} from "./outreach-ui-state.ts";

describe("outreach UI safety helpers", () => {
  it("hides draft generation for rejected opportunities", () => {
    assert.equal(shouldShowGenerateOutreachDraftButton("rejected", false), false);
    assert.equal(shouldShowRegenerateOutreachDraftButton("rejected", true), false);
  });

  it("allows approved and interesting opportunities to generate drafts", () => {
    assert.equal(shouldShowGenerateOutreachDraftButton("approved", false), true);
    assert.equal(shouldShowGenerateOutreachDraftButton("interesting", false), true);
  });

  it("shows regenerate only when a draft already exists", () => {
    assert.equal(shouldShowRegenerateOutreachDraftButton("approved", true), true);
    assert.equal(shouldShowRegenerateOutreachDraftButton("approved", false), false);
  });

  it("human edited badge does not imply card highlight", () => {
    assert.equal(shouldShowHumanEditedBadge(true), true);
    assert.equal(shouldShowHumanEditedBadge(false), false);
  });
});
