CREATE TABLE "test_profile_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"model_name" text NOT NULL,
	"evaluator_model_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_profile_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"profile_id" integer NOT NULL,
	"test_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"system_prompt" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "test_runs" ADD COLUMN "profile_id" integer;--> statement-breakpoint
ALTER TABLE "test_profile_models" ADD CONSTRAINT "test_profile_models_profile_id_test_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."test_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_profile_tests" ADD CONSTRAINT "test_profile_tests_profile_id_test_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."test_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_profile_tests" ADD CONSTRAINT "test_profile_tests_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_profiles" ADD CONSTRAINT "test_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_profile_models_profile_id_index" ON "test_profile_models" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_profile_models_unique" ON "test_profile_models" USING btree ("profile_id","model_name","evaluator_model_name");--> statement-breakpoint
CREATE INDEX "test_profile_tests_profile_id_index" ON "test_profile_tests" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "test_profile_tests_test_id_index" ON "test_profile_tests" USING btree ("test_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_profile_tests_unique" ON "test_profile_tests" USING btree ("profile_id","test_id");--> statement-breakpoint
CREATE INDEX "test_profiles_user_id_index" ON "test_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_profiles_name_user_index" ON "test_profiles" USING btree ("name","user_id");--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_profile_id_test_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."test_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_runs_profile_id_index" ON "test_runs" USING btree ("profile_id");