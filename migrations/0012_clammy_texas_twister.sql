ALTER TABLE "documents" ADD COLUMN "uploaded_file_id" integer;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_file_id_uploaded_files_id_fk" FOREIGN KEY ("uploaded_file_id") REFERENCES "public"."uploaded_files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;