CREATE TABLE "exports" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"filename" text,
	"content" text,
	"row_count" integer,
	"requested_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "exports" ADD CONSTRAINT "exports_requested_by_staff_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."staff_users"("id") ON DELETE no action ON UPDATE no action;
