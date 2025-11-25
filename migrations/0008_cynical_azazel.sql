CREATE TYPE "public"."file_status" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "status" "file_status" DEFAULT 'completed' NOT NULL;