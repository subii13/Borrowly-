-- Full-text search over listing text (used by modules/listings/search.ts).
CREATE INDEX "Listing_search_idx" ON "Listing"
  USING GIN (to_tsvector('english', title || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || description));

-- Integrity rules enforced by the database as a last line of defence.
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_stock_nonnegative" CHECK ("stockQuantity" >= 0);
ALTER TABLE "RentalBooking" ADD CONSTRAINT "RentalBooking_dates_valid" CHECK ("endDate" > "startDate");
ALTER TABLE "BookingHold" ADD CONSTRAINT "BookingHold_dates_valid" CHECK ("endDate" > "startDate");
ALTER TABLE "Review" ADD CONSTRAINT "Review_rating_range" CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE "Review" ADD CONSTRAINT "Review_one_target" CHECK (("bookingId" IS NULL) <> ("purchaseOrderId" IS NULL));
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK ("amountPaise" > 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amountPaise" > 0);
