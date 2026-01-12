ALTER TABLE "test_profiles" DROP CONSTRAINT "test_profiles_system_prompt_id_system_prompts_id_fk";
--> statement-breakpoint
ALTER TABLE "test_profiles" ALTER COLUMN "system_prompt_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "test_profiles" ADD CONSTRAINT "test_profiles_system_prompt_id_system_prompts_id_fk" FOREIGN KEY ("system_prompt_id") REFERENCES "public"."system_prompts"("id") ON DELETE set null ON UPDATE no action;