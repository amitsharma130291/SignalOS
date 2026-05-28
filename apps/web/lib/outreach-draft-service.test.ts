import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { GeneratedOutreachDraft } from "./outreach-generator.ts";
import {
  buildOutreachDraftEditUpdate,
  buildOutreachDraftReviewUpdate,
  canGenerateOutreachDraft,
  generateOutreachDraftForPainSignal,
  type OutreachDraftRepository,
  type SavedOutreachDraftRecord,
} from "./outreach-draft-service.ts";

function createRepository(existingDraft: SavedOutreachDraftRecord | null = null) {
  let savedDraft = existingDraft;
  const repository: OutreachDraftRepository = {
    async findPainSignalById(painSignalId) {
      return {
        id: painSignalId,
        status: "approved",
        rawText:
          "Our finance operations team manually reconciles Stripe payouts with NetSuite every week using spreadsheets and Slack updates.",
        pain: "manual operational work",
        affectedTeam: "Finance Ops",
        existingWorkaround: "manual operational workaround",
        outreachAngleRefined: "reduce manual operational work",
        targetTitles: ["VP Finance"],
        triggerEvent: "monthly close volume increases",
      };
    },
    async findDraftByPainSignalId() {
      return savedDraft;
    },
    async saveGeneratedDraft(painSignalId, draft, generatedAt) {
      savedDraft = {
        id: existingDraft?.id ?? "draft-1",
        painSignalId,
        generatedDraft: draft,
        qualityScore: draft.quality.score,
        qualityWarnings: draft.quality.warnings,
        status: existingDraft?.status ?? "draft_pending",
        humanSubject: existingDraft?.humanSubject ?? null,
        humanColdEmail: existingDraft?.humanColdEmail ?? null,
        humanLinkedinMessage: existingDraft?.humanLinkedinMessage ?? null,
        humanCta: existingDraft?.humanCta ?? null,
        humanHook: existingDraft?.humanHook ?? null,
        generatedAt,
      };
      return savedDraft;
    },
  };

  return {
    repository,
    getDraft: () => savedDraft,
  };
}

describe("outreach draft persistence service", () => {
  it("saves a generated draft", async () => {
    const { repository } = createRepository();
    const result = await generateOutreachDraftForPainSignal(repository, "pain-1");

    assert.equal(result.created, true);
    assert.equal(result.draft.painSignalId, "pain-1");
    assert.ok(result.draft.generatedDraft.cold_email);
  });

  it("does not create duplicates without regenerate", async () => {
    const existing = {
      id: "draft-existing",
      painSignalId: "pain-1",
      generatedDraft: { cold_email: "existing" } as GeneratedOutreachDraft,
      qualityScore: 70,
      qualityWarnings: [],
      status: "draft_pending" as const,
      humanSubject: "Keep this subject",
      generatedAt: new Date("2026-01-01"),
    };
    const { repository } = createRepository(existing);
    const result = await generateOutreachDraftForPainSignal(repository, "pain-1");

    assert.equal(result.created, false);
    assert.equal(result.regenerated, false);
    assert.equal(result.draft.id, "draft-existing");
    assert.equal(result.draft.humanSubject, "Keep this subject");
  });

  it("regenerate overwrites generated draft while preserving human edits", async () => {
    const existing = {
      id: "draft-existing",
      painSignalId: "pain-1",
      generatedDraft: { cold_email: "old generated" } as GeneratedOutreachDraft,
      qualityScore: 55,
      qualityWarnings: [],
      status: "draft_pending" as const,
      humanColdEmail: "Human edited body",
      generatedAt: new Date("2026-01-01"),
    };
    const { repository, getDraft } = createRepository(existing);
    const result = await generateOutreachDraftForPainSignal(repository, "pain-1", { regenerate: true });

    assert.equal(result.regenerated, true);
    assert.notEqual(getDraft()?.generatedDraft.cold_email, "old generated");
    assert.ok(result.draft.generatedDraft.cold_email.includes("Stripe"));
    assert.ok(result.draft.generatedDraft.cold_email.includes("NetSuite"));
    assert.equal(result.draft.humanColdEmail, "Human edited body");
  });

  it("persists edited draft fields", () => {
    const update = buildOutreachDraftEditUpdate({
      subject: " New subject ",
      coldEmail: " Updated email ",
      linkedinMessage: " Updated LinkedIn ",
      cta: " Worth a look? ",
      hook: " New hook ",
      notes: " reviewed ",
      editedAt: new Date("2026-01-01"),
    });

    assert.equal(update.humanSubject, "New subject");
    assert.equal(update.humanColdEmail, "Updated email");
    assert.equal(update.humanLinkedinMessage, "Updated LinkedIn");
    assert.equal(update.humanCta, "Worth a look?");
    assert.equal(update.humanHook, "New hook");
    assert.equal(update.humanNotes, "reviewed");
  });

  it("validates generation eligibility", () => {
    assert.equal(canGenerateOutreachDraft("approved"), true);
    assert.equal(canGenerateOutreachDraft("interesting"), true);
    assert.equal(canGenerateOutreachDraft("rejected"), false);
  });

  it("builds review status updates and rejects invalid statuses", () => {
    assert.equal(buildOutreachDraftReviewUpdate("reviewed").status, "reviewed");
    assert.throws(() => buildOutreachDraftReviewUpdate("sent"));
  });
});
