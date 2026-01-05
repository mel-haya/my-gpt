CREATE TYPE "public"."test_result_status" AS ENUM('Running', '', 'Success', 'Failed', 'Evaluating');--> statement-breakpoint
CREATE TYPE "public"."test_run_status" AS ENUM('Running', 'Failed', 'Done');--> statement-breakpoint
CREATE TABLE "test_run_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_run_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"output" text,
	"status" "test_result_status" DEFAULT 'Running' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"status" "test_run_status" DEFAULT 'Running' NOT NULL,
	"launched_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_run_results_test_run_id_index" ON "test_run_results" USING btree ("test_run_id");--> statement-breakpoint
CREATE INDEX "test_run_results_test_id_index" ON "test_run_results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "test_run_results_status_index" ON "test_run_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_runs_user_id_index" ON "test_runs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "test_runs_status_index" ON "test_runs" USING btree ("status");