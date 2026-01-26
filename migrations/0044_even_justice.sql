DROP INDEX "activities_embedding_index";--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN "embedded_text";--> statement-breakpoint
ALTER TABLE "activities" DROP COLUMN "embedding";