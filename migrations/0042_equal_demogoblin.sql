CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"model_id" text NOT NULL,
	"default" boolean DEFAULT false NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "models_model_id_unique" UNIQUE("model_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "models_model_id_index" ON "models" USING btree ("model_id");