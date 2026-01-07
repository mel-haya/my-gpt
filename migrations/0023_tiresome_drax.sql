ALTER TABLE "test_run_results" ADD COLUMN "model_used" text;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "system_prompt" text;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "tokens_cost" integer;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "execution_time_ms" integer;