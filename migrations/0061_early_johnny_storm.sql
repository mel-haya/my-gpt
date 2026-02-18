ALTER TABLE "tests" ADD COLUMN "hotel_id" integer;--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_hotel_id_hotels_id_fk" FOREIGN KEY ("hotel_id") REFERENCES "public"."hotels"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tests_hotel_id_index" ON "tests" USING btree ("hotel_id");