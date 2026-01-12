DROP INDEX "test_profile_models_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "test_profile_models_unique" ON "test_profile_models" USING btree ("profile_id","model_name");--> statement-breakpoint
ALTER TABLE "test_profile_models" DROP COLUMN "evaluator_model_name";--> statement-breakpoint
ALTER TABLE "test_profiles" DROP COLUMN "description";