-- Convert system_prompt column from text to foreign key reference
-- The column was already renamed to system_prompt_id, so we just need to:
-- 1. Convert the data type from text to integer
-- 2. Add foreign key constraint
-- 3. Add index

-- Step 1: Convert column type from text to integer
ALTER TABLE "test_profiles" ALTER COLUMN "system_prompt_id" TYPE integer USING system_prompt_id::integer;--> statement-breakpoint

-- Step 2: Add foreign key constraint
ALTER TABLE "test_profiles" ADD CONSTRAINT "test_profiles_system_prompt_id_system_prompts_id_fk" FOREIGN KEY ("system_prompt_id") REFERENCES "public"."system_prompts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Step 3: Add index for performance
CREATE INDEX "test_profiles_system_prompt_id_index" ON "test_profiles" USING btree ("system_prompt_id");