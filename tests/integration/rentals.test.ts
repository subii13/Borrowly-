import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkoutRental, cancelBooking, confirmRentalStep, createHold, expireHolds, quoteRental, sellerRespond } from "@/modules/rentals/service";
import { createReview } from "@/modules/reviews/service";
import { availableStock } from "@/modules/rentals/availability";
import { parseDay } from "@/lib/dates";
import { day, key, makeListing, makeSeller, makeUser, resetDb, testDb as db } from "../support/fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function setup(stock = 1) {
  const s = await makeSeller();
  const listing = await makeListing(s.seller.id, { stockQuantity: stock });
  const c = await makeUser();
  return { s, listing, c };
}

describe("rental booking engine", () => {
  it("prices on the server and creates a paid booking from a hold", async () => {
    const { listing, c } = await setup();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(2), endDate: day(5) });
    const booking = await checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key(), simulate: "approve" });
    expect(booking.status).toBe("REQUESTED");
    expect(booking.days).toBe(3);
    expect(booking.rentalSubtotalPaise).toBe(150_000);
    expect(booking.serviceFeePaise).toBe(3_000);
    expect(booking.totalPaise).toBe(150_000 + 3_000 + 200_000);
    expect(booking.commissionPaise).toBe(12_000);
    const payment = await db.payment.findFirstOrThrow({ where: { bookingId: booking.id } });
    expect(payment).toMatchObject({ status: "SUCCESS", amountPaise: booking.totalPaise });
    expect((await db.bookingHold.findUniqueOrThrow({ where: { id: hold.id } })).status).toBe("CONVERTED");
  });

  it("rejects overlapping dates but allows back-to-back bookings", async () => {
    const { listing, c } = await setup();
    const other = await makeUser();
    const h = await createHold(db, c.actor, { listingId: listing.id, startDate: day(2), endDate: day(5) });
    await checkoutRental(db, c.actor, { holdId: h.id, idempotencyKey: key() });
    await expect(createHold(db, other.actor, { listingId: listing.id, startDate: day(4), endDate: day(6) })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    await expect(createHold(db, other.actor, { listingId: listing.id, startDate: day(5), endDate: day(7) })).resolves.toBeTruthy();
  });

  it("prevents double booking under concurrent requests", async () => {
    const { listing } = await setup(1);
    const customers = await Promise.all(Array.from({ length: 6 }, () => makeUser()));
    const results = await Promise.allSettled(customers.map((c) => createHold(db, c.actor, { listingId: listing.id, startDate: day(3), endDate: day(6) })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(5);
  });

  it("respects multi-unit stock", async () => {
    const { listing } = await setup(2);
    const customers = await Promise.all(Array.from({ length: 4 }, () => makeUser()));
    const results = await Promise.allSettled(customers.map((c) => createHold(db, c.actor, { listingId: listing.id, startDate: day(3), endDate: day(6) })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    expect(await availableStock(db, listing, parseDay(day(3)), parseDay(day(6)))).toBe(0);
  });

  it("releases stock when a hold expires", async () => {
    const { listing, c } = await setup();
    const other = await makeUser();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) });
    await expect(createHold(db, other.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) })).rejects.toMatchObject({ code: "UNAVAILABLE" });
    const later = new Date(Date.now() + 16 * 60_000);
    await expect(createHold(db, other.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) }, later)).resolves.toBeTruthy();
    await expect(checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key() }, later)).rejects.toMatchObject({ code: "UNAVAILABLE" });
    expect(await expireHolds(db, later)).toBeGreaterThanOrEqual(1);
  });

  it("is idempotent: repeating checkout with the same key creates one booking", async () => {
    const { listing, c } = await setup();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) });
    const k = key();
    const [a, b] = await Promise.all([checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: k }), checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: k })]);
    expect(a.id).toBe(b.id);
    expect(await db.rentalBooking.count()).toBe(1);
    expect(await db.payment.count()).toBe(1);
  });

  it("records a failed payment without confirming the booking and frees the dates", async () => {
    const { listing, c } = await setup();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) });
    const b = await checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key(), simulate: "decline" });
    expect(b.status).toBe("PAYMENT_FAILED");
    expect((await db.payment.findFirstOrThrow({ where: { bookingId: b.id } })).status).toBe("FAILED");
    expect(await availableStock(db, listing, parseDay(day(2)), parseDay(day(4)))).toBe(1);
  });

  it("forbids sellers from booking their own listing and validates dates", async () => {
    const { s, listing, c } = await setup();
    await expect(createHold(db, s.actor, { listingId: listing.id, startDate: day(2), endDate: day(4) })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createHold(db, c.actor, { listingId: listing.id, startDate: day(-1), endDate: day(2) })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createHold(db, c.actor, { listingId: listing.id, startDate: day(3), endDate: day(3) })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(quoteRental(db, c.actor, listing.id, day(2), day(40))).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("cancellation refunds the payment and releases stock", async () => {
    const { listing, c } = await setup();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(3), endDate: day(5) });
    const b = await checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key() });
    await cancelBooking(db, c.actor, b.id, "Change of plans");
    expect((await db.payment.findFirstOrThrow({ where: { bookingId: b.id } })).status).toBe("REFUNDED");
    expect(await db.refund.count({ where: { type: "CANCELLATION" } })).toBe(1);
    expect(await availableStock(db, listing, parseDay(day(3)), parseDay(day(5)))).toBe(1);
  });

  it("runs the full lifecycle: confirm → handover → return → complete → single review", async () => {
    const { s, listing, c } = await setup();
    const stranger = await makeUser();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(0), endDate: day(2) });
    const b = await checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key() });

    await expect(sellerRespond(db, c.actor, b.id, "confirm")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(sellerRespond(db, stranger.actor, b.id, "confirm")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await sellerRespond(db, s.actor, b.id, "confirm");
    await expect(createReview(db, c.actor, { bookingId: b.id }, { rating: 5, comment: "Too early to review" })).rejects.toMatchObject({ code: "CONFLICT" });

    await confirmRentalStep(db, s.actor, b.id, "HANDOVER", { note: "All accessories included", photoKeys: [] });
    expect((await db.rentalBooking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("CONFIRMED");
    await expect(confirmRentalStep(db, s.actor, b.id, "HANDOVER", { photoKeys: [] })).rejects.toMatchObject({ code: "CONFLICT" });
    await confirmRentalStep(db, c.actor, b.id, "HANDOVER", { note: "Received", photoKeys: [] });
    expect((await db.rentalBooking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("ACTIVE");

    await confirmRentalStep(db, c.actor, b.id, "RETURN", { photoKeys: [] });
    expect((await db.rentalBooking.findUniqueOrThrow({ where: { id: b.id } })).status).toBe("RETURN_PENDING");
    await confirmRentalStep(db, s.actor, b.id, "RETURN", { note: "No damage", photoKeys: [] });
    const done = await db.rentalBooking.findUniqueOrThrow({ where: { id: b.id } });
    expect(done.status).toBe("COMPLETED");
    expect(await db.refund.findFirst({ where: { type: "DEPOSIT_RETURN" } })).toMatchObject({ amountPaise: 200_000 });

    await createReview(db, c.actor, { bookingId: b.id }, { rating: 4, comment: "Great camera, easy pickup." });
    await expect(createReview(db, c.actor, { bookingId: b.id }, { rating: 5, comment: "Trying to review twice" })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.sellerProfile.findUniqueOrThrow({ where: { id: s.seller.id } })).toMatchObject({ ratingSum: 4, ratingCount: 1 });
  });

  it("rejects evidence photos uploaded by someone else", async () => {
    const { s, listing, c } = await setup();
    const hold = await createHold(db, c.actor, { listingId: listing.id, startDate: day(0), endDate: day(2) });
    const b = await checkoutRental(db, c.actor, { holdId: hold.id, idempotencyKey: key() });
    await sellerRespond(db, s.actor, b.id, "confirm");
    await expect(confirmRentalStep(db, s.actor, b.id, "HANDOVER", { photoKeys: [`evidence/${c.user.id}/x.webp`] })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
