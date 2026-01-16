CREATE TYPE "public"."feedback_type" AS ENUM('positive', 'negative');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"message" text NOT NULL,
	"feedback" "feedback_type" NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"conversation_id" integer
);
--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "token_count" integer;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;