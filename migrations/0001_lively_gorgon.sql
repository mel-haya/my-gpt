

CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(1536)
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" serial NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "documents_embedding_index" ON "documents" USING hnsw ("embedding" vector_cosine_ops);