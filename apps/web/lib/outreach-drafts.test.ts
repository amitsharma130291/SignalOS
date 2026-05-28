import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateOutreachDraft } from "./outreach-generator.ts";
import { parseGeneratedOutreachDraft, shapeOutreachItem } from "./outreach-drafts.ts";

const generated = generateOutreachDraft({
  pain: "Finance Ops reconciles Stripe and NetSuite manually.",
  affectedTeam: "Finance Ops",
  existingWorkaround: "spreadsheet checks",
  outreachAngleRefined: "Stripe and NetSuite reconciliation",
  targetTitles: ["VP Finance"],
  triggerEvent: "monthly close volume increases",
});

describe("outreach draft shaping", () => {
  it("parses generated draft JSON safely", () => {
    const parsed = parseGeneratedOutreachDraft(generated);

    assert.equal(parsed.cold_email, generated.cold_email);
    assert.equal(parsed.variants.consultative, generated.variants.consultative);
  });

  it("prefers human edited draft fields", () => {
    const item = shapeOutreachItem({
      id: "pain-1",
      status: "approved",
      pain: "Generated pain",
      outreachDraft: {
        id: "draft-1",
        generatedDraft: generated,
        qualityScore: generated.quality.score,
        qualityWarnings: generated.quality.warnings,
        status: "draft_pending",
        humanSubject: "Human subject",
        humanColdEmail: "Human email body",
      },
    });

    assert.equal(item.draft?.subject, "Human subject");
    assert.equal(item.draft?.coldEmail, "Human email body");
    assert.equal(item.draft?.hasHumanEdits, true);
  });

  it("falls back to generated fields when no edits exist", () => {
    const item = shapeOutreachItem({
      id: "pain-1",
      status: "approved",
      pain: "Generated pain",
      outreachDraft: {
        id: "draft-1",
        generatedDraft: generated,
        qualityScore: generated.quality.score,
        qualityWarnings: generated.quality.warnings,
        status: "draft_pending",
      },
    });

    assert.equal(item.draft?.subject, generated.email_subjects[0]);
    assert.equal(item.draft?.coldEmail, generated.cold_email);
    assert.equal(item.draft?.hasHumanEdits, false);
  });
});
