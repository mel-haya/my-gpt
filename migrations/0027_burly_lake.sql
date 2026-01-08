ALTER TABLE "system_prompts" RENAME COLUMN "is_active" TO "default";--> statement-breakpoint
DROP INDEX "system_prompts_is_active_index";