CREATE TYPE "public"."staff_request_category" AS ENUM('reservation', 'room_issue', 'room_service', 'housekeeping', 'maintenance', 'concierge', 'other');--> statement-breakpoint
CREATE TYPE "public"."staff_request_status" AS ENUM('pending', 'in_progress', 'done');--> statement-breakpoint
CREATE TYPE "public"."staff_request_urgency" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TABLE "staff_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "staff_request_category" NOT NULL,
	"urgency" "staff_request_urgency" DEFAULT 'medium' NOT NULL,
	"room_number" integer,
	"status" "staff_request_status" DEFAULT 'pending' NOT NULL,
	"completed_by" text,
	"completion_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "staff_requests" ADD CONSTRAINT "staff_requests_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_requests_status_index" ON "staff_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "staff_requests_urgency_index" ON "staff_requests" USING btree ("urgency");--> statement-breakpoint
CREATE INDEX "staff_requests_created_at_index" ON "staff_requests" USING btree ("created_at");