ALTER TABLE "messages" ADD COLUMN "model_used" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;