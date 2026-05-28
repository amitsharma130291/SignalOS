-- CreateTable
CREATE TABLE "outreach_drafts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pain_signal_id" UUID NOT NULL,
    "generated_draft" JSONB NOT NULL,
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quality_warnings" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft_pending',
    "human_subject" TEXT,
    "human_cold_email" TEXT,
    "human_linkedin_message" TEXT,
    "human_cta" TEXT,
    "human_hook" TEXT,
    "human_notes" TEXT,
    "human_edited_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outreach_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outreach_drafts_pain_signal_id_key" ON "outreach_drafts"("pain_signal_id");

-- CreateIndex
CREATE INDEX "outreach_drafts_status_idx" ON "outreach_drafts"("status");

-- CreateIndex
CREATE INDEX "outreach_drafts_generated_at_idx" ON "outreach_drafts"("generated_at");

-- CreateIndex
CREATE INDEX "outreach_drafts_reviewed_at_idx" ON "outreach_drafts"("reviewed_at");

-- AddForeignKey
ALTER TABLE "outreach_drafts" ADD CONSTRAINT "outreach_drafts_pain_signal_id_fkey" FOREIGN KEY ("pain_signal_id") REFERENCES "pain_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
