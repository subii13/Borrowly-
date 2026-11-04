import { Prisma, type RentalBooking } from "@prisma/client";
import type { Db } from "@/lib/db";
import { addDays, daysBetween, formatDay, parseDay, todayIST } from "@/lib/dates";
import { AppError, conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { formatINR } from "@/lib/money";
import { requireParty, type Actor } from "@/lib/permissions";
import { referenceCode } from "@/lib/crypto";
import { audit, getSettings, notify } from "@/modules/platform/service";
import { paymentProvider } from "@/modules/payments/provider";
import { lateFee, rentalQuote } from "@/modules/pricing/pricing";
import { addEvidence } from "@/modules/handovers/service";
import { availableStock, lockListing } from "./availability";

const MAX_ADVANCE_DAYS = 180;

function validateRange(listing: { minRentalDays: number; maxRentalDays: number }, startISO: string, endISO: string, now: Date) {
  let start: Date, end: Date;
  try {
    start = parseDay(startISO);
    end = parseDay(endISO);
  } catch {
    throw invalid("Choose valid rental dates");
  }
  const days = daysBetween(start, end);
  const today = todayIST(now);
  if (start < today) throw invalid("The rental cannot start in the past");
  if (days < 1) throw invalid("The return date must be after the start date");
  if (start > addDays(today, MAX_ADVANCE_DAYS)) throw invalid(`Bookings open up to ${MAX_ADVANCE_DAYS} days ahead`);
  if (days < listing.minRentalDays) throw invalid(`Minimum rental is ${listing.minRentalDays} day(s)`);
  if (days > listing.maxRentalDays) throw invalid(`Maximum rental is ${listing.maxRentalDays} days`);
  return { start, end, days };
}

function assertRentable(listing: { status: string; rentalEnabled: boolean; dailyRatePaise: number | null; sellerId: string }, actor: Actor) {
  if (listing.status !== "ACTIVE" || !listing.rentalEnabled || listing.dailyRatePaise === null) throw new AppError("UNAVAILABLE", "This item is not available to rent");
  if (actor.sellerId === listing.sellerId) throw forbidden("You cannot rent your own listing");
}

/** Price + availability preview. Read-only; no inventory is reserved. */
export async function quoteRental(db: Db, actor: Actor, listingId: string, startISO: string, endISO: string, quantity = 1, now = new Date()) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound("Listing");
  assertRentable(listing, actor);
  const { start, end, days } = validateRange(listing, startISO, endISO, now);
  const settings = await getSettings(db);
  const available = await availableStock(db, listing, start, end, now);
  const quote = rentalQuote({ dailyRatePaise: listing.dailyRatePaise!, depositPaise: listing.depositPaise ?? 0, days, quantity, ...settings });
  return { quote, available, isAvailable: available >= quantity };
}

/**
 * Step 1 of checkout: reserve stock for a short time. The listing row is locked so two
 * customers can never both hold the last unit for overlapping dates.
 */
export async function createHold(db: Db, actor: Actor, input: { listingId: string; startDate: string; endDate: string; quantity?: number }, now = new Date()) {
  const quantity = input.quantity ?? 1;
  return db.$transaction(async (tx) => {
    await lockListing(tx, input.listingId);
    const listing = await tx.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw notFound("Listing");
    assertRentable(listing, actor);
    const { start, end } = validateRange(listing, input.startDate, input.endDate, now);
    // A customer's previous unfinished checkout for this listing must not block them.
    await tx.bookingHold.updateMany({ where: { listingId: listing.id, customerId: actor.id, status: "ACTIVE" }, data: { status: "RELEASED" } });
    const available = await availableStock(tx, listing, start, end, now);
    if (available < quantity) throw new AppError("UNAVAILABLE", "Those dates are no longer available. Please choose different dates.");
    const settings = await getSettings(tx);
    return tx.bookingHold.create({
      data: { listingId: listing.id, customerId: actor.id, startDate: start, endDate: end, quantity, expiresAt: new Date(now.getTime() + settings.holdMinutes * 60_000) },
    });
  });
}

export async function releaseHold(db: Db, actor: Actor, holdId: string) {
  await db.bookingHold.updateMany({ where: { id: holdId, customerId: actor.id, status: "ACTIVE" }, data: { status: "RELEASED" } });
}

/** Housekeeping: mark lapsed holds. Expired holds already stop blocking stock via expiresAt. */
export async function expireHolds(db: Db, now = new Date()) {
  const { count } = await db.bookingHold.updateMany({ where: { status: "ACTIVE", expiresAt: { lte: now } }, data: { status: "RELEASED" } });
  return count;
}

/**
 * Step 2 of checkout: convert a valid hold into a booking, then charge. The booking (and its
 * payment record) exist before any charge is attempted, so a customer is never charged for a
 * booking that was not created. Repeating the call with the same idempotency key is a no-op.
 */
export async function checkoutRental(db: Db, actor: Actor, input: { holdId: string; idempotencyKey: string; simulate?: "approve" | "decline" }, now = new Date()) {
  const existing = await db.rentalBooking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.customerId !== actor.id) throw notFound("Booking");
    return existing;
  }

  let created: { booking: RentalBooking; paymentId: string };
  try {
    created = await db.$transaction(async (tx) => {
      const hold = await tx.bookingHold.findUnique({ where: { id: input.holdId } });
      if (!hold || hold.customerId !== actor.id) throw notFound("Reservation");
      await lockListing(tx, hold.listingId);
      const fresh = await tx.bookingHold.findUniqueOrThrow({ where: { id: hold.id } });
      if (fresh.status !== "ACTIVE" || fresh.expiresAt <= now) throw new AppError("UNAVAILABLE", "Your reservation expired. Please select your dates again.");
      const listing = await tx.listing.findUniqueOrThrow({ where: { id: hold.listingId } });
      assertRentable(listing, actor);
      const available = await availableStock(tx, listing, hold.startDate, hold.endDate, now, hold.id);
      if (available < hold.quantity) throw new AppError("UNAVAILABLE", "Those dates are no longer available.");

      const settings = await getSettings(tx);
      const q = rentalQuote({
        dailyRatePaise: listing.dailyRatePaise!,
        depositPaise: listing.depositPaise ?? 0,
        days: daysBetween(hold.startDate, hold.endDate),
        quantity: hold.quantity,
        ...settings,
      });
      await tx.bookingHold.update({ where: { id: hold.id }, data: { status: "CONVERTED" } });
      const booking = await tx.rentalBooking.create({
        data: {
          code: referenceCode("BR"),
          listingId: listing.id,
          customerId: actor.id,
          sellerId: listing.sellerId,
          holdId: hold.id,
          startDate: hold.startDate,
          endDate: hold.endDate,
          days: q.days,
          quantity: q.quantity,
          dailyRatePaise: q.dailyRatePaise,
          rentalSubtotalPaise: q.rentalSubtotalPaise,
          depositPaise: q.depositPaise,
          serviceFeePaise: q.serviceFeePaise,
          totalPaise: q.totalPaise,
          customerFeeBps: q.customerFeeBps,
          commissionBps: q.commissionBps,
          commissionPaise: q.commissionPaise,
          sellerNetPaise: q.sellerNetPaise,
          idempotencyKey: input.idempotencyKey,
          status: "PENDING_PAYMENT",
        },
      });
      const payment = await tx.payment.create({
        data: { provider: paymentProvider().name, amountPaise: q.totalPaise, payerId: actor.id, bookingId: booking.id, idempotencyKey: `pay_${input.idempotencyKey}`, status: "PENDING" },
      });
      await audit(tx, { actorId: actor.id, action: "booking.created", entityType: "RentalBooking", entityId: booking.id, metadata: { totalPaise: q.totalPaise } });
      return { booking, paymentId: payment.id };
    });
  } catch (err) {
    // Lost a race on the idempotency key: return the booking the other request created.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.rentalBooking.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again && again.customerId === actor.id) return again;
    }
    throw err;
  }

  const { booking, paymentId } = created;
  const result = await paymentProvider().charge({ amountPaise: booking.totalPaise, idempotencyKey: `pay_${input.idempotencyKey}`, description: `Rental ${booking.code}`, simulate: input.simulate });

  return db.$transaction(async (tx) => {
    if (result.ok) {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", providerRef: result.providerRef } });
      const updated = await tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "REQUESTED" }, include: { listing: { include: { seller: true } } } });
      await notify(tx, updated.listing.seller.userId, {
        type: "booking.requested",
        title: "New rental request",
        body: `${updated.listing.title} · ${formatDay(updated.startDate)} → ${formatDay(updated.endDate)}. Please confirm or decline.`,
        link: `/seller/bookings/${updated.id}`,
      });
      await notify(tx, actor.id, { type: "booking.paid", title: "Booking request sent", body: `${updated.code}: demo payment of ${formatINR(updated.totalPaise)} succeeded. Waiting for the seller to confirm.`, link: `/account/bookings/${updated.id}` });
      await audit(tx, { actorId: actor.id, action: "payment.succeeded", entityType: "RentalBooking", entityId: booking.id });
      const { listing: _l, ...plain } = updated;
      return plain;
    }
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", failureReason: result.reason } });
    await audit(tx, { actorId: actor.id, action: "payment.failed", entityType: "RentalBooking", entityId: booking.id, metadata: { reason: result.reason } });
    return tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "PAYMENT_FAILED", cancelReason: result.reason } });
  });
}

async function loadForParty(db: Db, actor: Actor, bookingId: string) {
  const booking = await db.rentalBooking.findUnique({ where: { id: bookingId }, include: { listing: { select: { title: true } }, seller: { select: { userId: true } } } });
  if (!booking) throw notFound("Booking");
  return { booking, party: requireParty(actor, booking) };
}

async function refundBooking(tx: Prisma.TransactionClient, bookingId: string, actorId: string, reason: string) {
  const payment = await tx.payment.findFirst({ where: { bookingId, status: "SUCCESS" } });
  if (!payment) return;
  const r = await paymentProvider().refund({ providerRef: payment.providerRef ?? "", amountPaise: payment.amountPaise });
  await tx.refund.create({ data: { paymentId: payment.id, type: "CANCELLATION", status: "PROCESSED", amountPaise: payment.amountPaise, reason, createdById: actorId, processedAt: new Date() } });
  await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", providerRef: payment.providerRef ?? r.providerRef } });
}

export async function sellerRespond(db: Db, actor: Actor, bookingId: string, decision: "confirm" | "decline", reason?: string) {
  const { booking, party } = await loadForParty(db, actor, bookingId);
  if (party !== "seller") throw forbidden("Only the seller can respond to this request");
  return db.$transaction(async (tx) => {
    const fresh = await tx.rentalBooking.findUniqueOrThrow({ where: { id: booking.id } });
    if (fresh.status !== "REQUESTED") throw conflict("This request has already been handled");
    if (decision === "confirm") {
      const b = await tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "CONFIRMED", sellerConfirmedAt: new Date() } });
      await notify(tx, booking.customerId, { type: "booking.confirmed", title: "Booking confirmed", body: `${booking.listing.title} is confirmed for ${formatDay(b.startDate)}. Pickup details are now visible.`, link: `/account/bookings/${b.id}` });
      await audit(tx, { actorId: actor.id, action: "booking.confirmed", entityType: "RentalBooking", entityId: b.id });
      return b;
    }
    const b = await tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "REJECTED", cancelledAt: new Date(), cancelReason: reason || "Declined by seller" } });
    await refundBooking(tx, b.id, actor.id, "Seller declined the booking");
    await notify(tx, booking.customerId, { type: "booking.declined", title: "Booking declined", body: `The seller declined ${booking.listing.title}. Your demo payment has been refunded in full.`, link: `/account/bookings/${b.id}` });
    await audit(tx, { actorId: actor.id, action: "booking.declined", entityType: "RentalBooking", entityId: b.id, metadata: { reason: reason ?? null } });
    return b;
  });
}

/** Customer or seller cancels before the rental starts. Full refund (simple MVP policy). */
export async function cancelBooking(db: Db, actor: Actor, bookingId: string, reason: string, now = new Date()) {
  const { booking, party } = await loadForParty(db, actor, bookingId);
  if (party === "admin") throw forbidden("Admins resolve bookings through disputes");
  return db.$transaction(async (tx) => {
    const fresh = await tx.rentalBooking.findUniqueOrThrow({ where: { id: booking.id } });
    if (!["REQUESTED", "CONFIRMED"].includes(fresh.status)) throw conflict("This booking can no longer be cancelled");
    if (fresh.startDate <= todayIST(now) && fresh.status === "CONFIRMED") throw conflict("The rental has started — raise a dispute instead");
    const b = await tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", cancelledAt: now, cancelReason: reason || `Cancelled by ${party}` } });
    await refundBooking(tx, b.id, actor.id, `Cancelled by ${party}`);
    const other = party === "customer" ? booking.seller.userId : booking.customerId;
    await notify(tx, other, { type: "booking.cancelled", title: "Booking cancelled", body: `${booking.code} for ${booking.listing.title} was cancelled by the ${party}.`, link: party === "customer" ? `/seller/bookings/${b.id}` : `/account/bookings/${b.id}` });
    await audit(tx, { actorId: actor.id, action: "booking.cancelled", entityType: "RentalBooking", entityId: b.id, metadata: { party, reason } });
    return b;
  });
}

/**
 * Handover (pickup) and return are confirmed independently by both parties, each adding
 * immutable evidence. The booking advances only when both have confirmed.
 */
export async function confirmRentalStep(
  db: Db,
  actor: Actor,
  bookingId: string,
  type: "HANDOVER" | "RETURN",
  evidence: { note?: string; photoKeys: string[] },
  now = new Date(),
) {
  const { booking, party } = await loadForParty(db, actor, bookingId);
  if (party === "admin") throw forbidden("Only the customer or seller can confirm");
  return db.$transaction(async (tx) => {
    const fresh = await tx.rentalBooking.findUniqueOrThrow({ where: { id: booking.id } });
    const allowed = type === "HANDOVER" ? ["CONFIRMED"] : ["ACTIVE", "RETURN_PENDING"];
    if (!allowed.includes(fresh.status)) throw conflict(type === "HANDOVER" ? "Handover is only possible on a confirmed booking" : "This rental is not active");

    const handover = await tx.handover.upsert({ where: { bookingId_type: { bookingId: booking.id, type } }, update: {}, create: { bookingId: booking.id, type } });
    const already = party === "seller" ? handover.sellerConfirmedAt : handover.customerConfirmedAt;
    if (already) throw conflict("You have already confirmed this step");
    await addEvidence(tx, handover.id, actor.id, evidence);
    const h = await tx.handover.update({ where: { id: handover.id }, data: party === "seller" ? { sellerConfirmedAt: now } : { customerConfirmedAt: now } });
    const both = h.sellerConfirmedAt && h.customerConfirmedAt;
    const other = party === "customer" ? booking.seller.userId : booking.customerId;
    const link = (p: string) => (p === "customer" ? `/seller/bookings/${booking.id}` : `/account/bookings/${booking.id}`);

    if (type === "HANDOVER") {
      if (both) await tx.rentalBooking.update({ where: { id: booking.id }, data: { status: "ACTIVE", handedOverAt: now } });
      await notify(tx, other, { type: "handover", title: both ? "Rental is now active" : "Handover confirmed by other party", body: `${booking.listing.title}: ${both ? "both parties confirmed the handover." : `the ${party} confirmed handover. Please confirm on your side.`}`, link: link(party) });
    } else {
      let data: Prisma.RentalBookingUpdateInput = { status: "RETURN_PENDING", returnedAt: fresh.returnedAt ?? now };
      if (both) {
        const lateDays = Math.max(0, daysBetween(fresh.endDate, todayIST(now)));
        const fee = lateFee({ dailyRatePaise: fresh.dailyRatePaise, lateDays, quantity: fresh.quantity, depositPaise: fresh.depositPaise });
        data = { ...data, status: "COMPLETED", completedAt: now, lateDays, lateFeePaise: fee };
        const payment = await tx.payment.findFirst({ where: { bookingId: booking.id, status: "SUCCESS" } });
        const depositBack = fresh.depositPaise - fee;
        if (payment && depositBack > 0) {
          await tx.refund.create({ data: { paymentId: payment.id, type: "DEPOSIT_RETURN", status: "PROCESSED", amountPaise: depositBack, reason: fee ? `Deposit returned less late fee (${lateDays} day(s))` : "Deposit returned", processedAt: now } });
        }
      }
      await tx.rentalBooking.update({ where: { id: booking.id }, data });
      await notify(tx, other, { type: "return", title: both ? "Rental completed" : "Return confirmed by other party", body: `${booking.listing.title}: ${both ? "the return is complete and the deposit has been released (demo)." : `the ${party} confirmed the return. Please confirm on your side.`}`, link: link(party) });
      if (both) await notify(tx, booking.customerId, { type: "review.invite", title: "How was your rental?", body: `Leave a review for ${booking.listing.title}.`, link: `/account/bookings/${booking.id}` });
    }
    await audit(tx, { actorId: actor.id, action: `${type.toLowerCase()}.confirmed`, entityType: "RentalBooking", entityId: booking.id, metadata: { party } });
    return tx.rentalBooking.findUniqueOrThrow({ where: { id: booking.id } });
  });
}
