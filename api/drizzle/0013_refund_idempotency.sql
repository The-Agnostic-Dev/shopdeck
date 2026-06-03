ALTER TABLE "refunds" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE INDEX "refunds_idempotency_idx" ON "refunds" USING btree ("idempotency_key");
