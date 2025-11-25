CREATE TABLE "uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "file_hash_index" ON "uploaded_files" USING btree ("file_hash");