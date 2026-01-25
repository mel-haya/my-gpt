ALTER TABLE "test_run_results" ADD COLUMN "model_id" integer;--> statement-breakpoint

UPDATE "test_run_results" 
SET "model_id" = "models"."id" 
FROM "models" 
WHERE "test_run_results"."model_used" = "models"."model_id";--> statement-breakpoint

ALTER TABLE "test_run_results" DROP COLUMN "model_used";--> statement-breakpoint

ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "test_run_results_model_id_index" ON "test_run_results" USING btree ("model_id");