ALTER TABLE "staff_requests" ADD COLUMN "admin_title" text;--> statement-breakpoint
ALTER TABLE "staff_requests" ADD COLUMN "admin_description" text;--> statement-breakpoint
ALTER TABLE "test_run_results" DROP COLUMN "manual_expected_result";