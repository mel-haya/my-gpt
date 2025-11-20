CREATE TYPE "public"."roles" AS ENUM('system', 'user', 'assistant');--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "role" SET DATA TYPE "public"."roles" USING "role"::"public"."roles";--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "title" text;