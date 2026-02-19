ALTER TABLE "tests" ALTER COLUMN "hotel_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "tests" ADD CONSTRAINT "tests_hotel_id_required_unless_manual"
  CHECK ("is_manual" OR "hotel_id" IS NOT NULL);
