-- AlterTable
ALTER TABLE "pain_signals" ADD COLUMN "frequency" TEXT,
ADD COLUMN "current_solution" TEXT,
ADD COLUMN "solution_gap" TEXT,
ADD COLUMN "founder_conviction" INTEGER;

-- CreateTable
CREATE TABLE "interviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "opportunity_id" UUID NOT NULL,
    "contact_name" TEXT,
    "company" TEXT,
    "title" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "interviews_opportunity_id_idx" ON "interviews"("opportunity_id");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- CreateIndex
CREATE INDEX "interviews_created_at_idx" ON "interviews"("created_at");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "pain_signals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
