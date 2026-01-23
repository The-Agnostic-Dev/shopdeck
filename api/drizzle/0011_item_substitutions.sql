ALTER TABLE "order_items" ADD COLUMN "status" text DEFAULT 'ok' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substitute_product_id" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substitute_name" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "substitute_price_kobo" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_substitute_product_id_products_id_fk" FOREIGN KEY ("substitute_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
