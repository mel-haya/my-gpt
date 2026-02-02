CREATE TABLE "hotel_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"hotel_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"location" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD COLUMN "hotel_id" integer;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD CONSTRAINT "hotel_staff_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD CONSTRAINT "hotel_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hotel_staff_hotel_id_index" ON "hotel_staff" USING btree ("hotel_id");--> statement-breakpoint
CREATE INDEX "hotel_staff_user_id_index" ON "hotel_staff" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "hotel_staff_unique" ON "hotel_staff" USING btree ("hotel_id","user_id");--> statement-breakpoint
CREATE INDEX "hotels_name_index" ON "hotels" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "hotels_name_unique" ON "hotels" USING btree ("name");--> statement-breakpoint
ALTER TABLE "uploaded_files" ADD CONSTRAINT "uploaded_files_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploaded_files_hotel_id_index" ON "uploaded_files" USING btree ("hotel_id");