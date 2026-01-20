ALTER TABLE "feedback" ADD COLUMN "message_id" integer;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "llm_key" text;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback" DROP COLUMN "message";