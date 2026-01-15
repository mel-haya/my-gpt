ALTER TABLE "test_run_results" ALTER COLUMN "test_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_profiles" ADD COLUMN "manual_tests" jsonb;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "manual_prompt" text;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "manual_expected_result" text;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "evaluator_model" text;