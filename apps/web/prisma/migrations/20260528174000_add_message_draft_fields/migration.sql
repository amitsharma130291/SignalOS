ALTER TABLE "messages"
ADD COLUMN "pain_signal_id" UUID,
ADD COLUMN "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "messages_pain_signal_id_idx" ON "messages"("pain_signal_id");
CREATE INDEX "messages_generated_at_idx" ON "messages"("generated_at");

ALTER TABLE "messages"
ADD CONSTRAINT "messages_pain_signal_id_fkey"
FOREIGN KEY ("pain_signal_id") REFERENCES "pain_signals"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
