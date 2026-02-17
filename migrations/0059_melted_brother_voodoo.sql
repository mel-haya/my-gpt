ALTER TABLE "hotels" ADD COLUMN "system_prompt_id" integer;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "model_id" integer;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_system_prompt_id_system_prompts_id_fk" FOREIGN KEY ("system_prompt_id") REFERENCES "public"."system_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotels_system_prompt_id_index" ON "hotels" USING btree ("system_prompt_id");--> statement-breakpoint
CREATE INDEX "hotels_model_id_index" ON "hotels" USING btree ("model_id");--> statement-breakpoint
ALTER TABLE "uploaded_files" DROP COLUMN "include_in_tests";