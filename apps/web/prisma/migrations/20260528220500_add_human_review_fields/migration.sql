ALTER TABLE "pain_signals"
ADD COLUMN "human_pain" TEXT,
ADD COLUMN "human_urgency" TEXT,
ADD COLUMN "human_affected_team" TEXT,
ADD COLUMN "human_existing_workaround" TEXT,
ADD COLUMN "human_possible_icp" TEXT,
ADD COLUMN "human_monetization_score" DOUBLE PRECISION,
ADD COLUMN "human_outreach_angle" TEXT,
ADD COLUMN "human_target_titles" JSONB,
ADD COLUMN "human_company_size" TEXT,
ADD COLUMN "human_industry" TEXT,
ADD COLUMN "human_buyer" TEXT,
ADD COLUMN "human_budget_owner" TEXT,
ADD COLUMN "human_trigger_event" TEXT,
ADD COLUMN "human_outreach_angle_refined" TEXT,
ADD COLUMN "human_notes" TEXT,
ADD COLUMN "angle_feedback" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

ALTER TABLE "messages"
ADD COLUMN "human_subject" TEXT,
ADD COLUMN "human_body" TEXT,
ADD COLUMN "review_notes" TEXT,
ADD COLUMN "reviewed_at" TIMESTAMP(3);

CREATE INDEX "messages_reviewed_at_idx" ON "messages"("reviewed_at");
