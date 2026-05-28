ALTER TABLE "pain_signals"
ADD COLUMN "target_titles" JSONB,
ADD COLUMN "company_size" TEXT,
ADD COLUMN "industry" TEXT,
ADD COLUMN "buyer" TEXT,
ADD COLUMN "budget_owner" TEXT,
ADD COLUMN "trigger_event" TEXT,
ADD COLUMN "outreach_angle_refined" TEXT,
ADD COLUMN "icp_generated_at" TIMESTAMP(3);
