ALTER TABLE "tests" DROP CONSTRAINT "tests_hotel_id_hotels_id_fk";
--> statement-breakpoint
ALTER TABLE "tests" ALTER COLUMN "hotel_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "hotel_id" integer;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_hotel_id_index" ON "activities" USING btree ("hotel_id");