CREATE TYPE "public"."activity_category" AS ENUM('restaurants', 'tours', 'wellness', 'sports', 'entertainment', 'shopping', 'culture', 'nature');--> statement-breakpoint
CREATE TYPE "public"."price_indicator" AS ENUM('free', '$', '$$', '$$$', '$$$$');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"location" text,
	"category" "activity_category",
	"distance_from_hotel" text,
	"price_indicator" "price_indicator",
	"phone" text,
	"website" text,
	"image_url" text,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "activities_embedding_index" ON "activities" USING hnsw ("embedding" vector_cosine_ops);