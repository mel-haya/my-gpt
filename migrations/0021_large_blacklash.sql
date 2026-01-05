ALTER TABLE "test_run_results" ALTER COLUMN "test_run_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_run_results" DROP COLUMN "knowledge_base_output";