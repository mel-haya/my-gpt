ALTER TABLE "test_run_results" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "test_run_results" ALTER COLUMN "status" SET DEFAULT 'Running'::text;--> statement-breakpoint
DROP TYPE "public"."test_result_status";--> statement-breakpoint
CREATE TYPE "public"."test_result_status" AS ENUM('Pending', 'Running', 'Success', 'Failed', 'Evaluating', 'Stopped');--> statement-breakpoint
ALTER TABLE "test_run_results" ALTER COLUMN "status" SET DEFAULT 'Running'::"public"."test_result_status";--> statement-breakpoint
ALTER TABLE "test_run_results" ALTER COLUMN "status" SET DATA TYPE "public"."test_result_status" USING "status"::"public"."test_result_status";--> statement-breakpoint
ALTER TABLE "test_run_results" ADD COLUMN "tool_calls" jsonb;