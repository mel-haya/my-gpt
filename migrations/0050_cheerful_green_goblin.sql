ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'hotel_staff';--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "hotel_id" integer;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "preferred_language" text DEFAULT 'english' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotels" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_slug_unique" UNIQUE("slug");