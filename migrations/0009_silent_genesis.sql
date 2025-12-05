CREATE TABLE "user_token_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"usage_date" date DEFAULT now() NOT NULL,
	"messages_sent" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"daily_message_limit" integer DEFAULT 10 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "user_date_index" ON "user_token_usage" USING btree ("user_id","usage_date");--> statement-breakpoint
CREATE INDEX "user_id_index" ON "user_token_usage" USING btree ("user_id");