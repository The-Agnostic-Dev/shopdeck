CREATE TABLE "dev_outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
