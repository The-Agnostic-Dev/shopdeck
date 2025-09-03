CREATE TABLE "delivery_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" date NOT NULL,
	"starts_at" text NOT NULL,
	"ends_at" text NOT NULL,
	"capacity" integer NOT NULL,
	"booked" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "slot_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_slot_id_delivery_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."delivery_slots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "delivery_slots_day_idx" ON "delivery_slots" USING btree ("day");
