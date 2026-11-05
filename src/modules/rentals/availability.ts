import type { BookingStatus } from "@prisma/client";
import type { DbOrTx, Tx } from "@/lib/db";
import { addDays, daysBetween, formatDayISO, rangesOverlap } from "@/lib/dates";

/** Booking states that hold inventory. Cancelled/rejected/failed/completed bookings release it. */
export const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ["PENDING_PAYMENT", "REQUESTED", "CONFIRMED", "ACTIVE", "RETURN_PENDING"];

export const STALE_PAYMENT_MS = 15 * 60_000;

type Reservation ={ startDate: Date; endDate: Date; quantity: number };

/** Sum of reserved units overlapping [start, end). Pure — used by the DB query and unit tests. */
export function overlappingQuantity(reservations: Reservation[], start: Date, end: Date): number {
  return reservations.reduce((sum, r) => (rangesOverlap(r.startDate, r.endDate, start, end) ? sum + r.quantity : sum), 0);
}

/** Peak number of units reserved on any single day — determines how many units can be sold outright. */
export function peakReserved(reservations: Reservation[]): number {
  const events: [number, number][] = [];
  for (const r of reservations) events.push([r.startDate.getTime(), r.quantity], [r.endDate.getTime(), -r.quantity]);
  // Ends sort before starts on the same instant because intervals are half-open.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let cur = 0;
  let peak = 0;
  for (const [, delta] of events) peak = Math.max(peak, (cur += delta));
  return peak;
}

/** Locks the listing row so concurrent bookings/purchases of the same listing are serialised. */
export async function lockListing(tx: Tx, listingId: string) {
  await tx.$queryRaw`SELECT id FROM "Listing" WHERE id = ${listingId} FOR UPDATE`;
}

export async function activeReservations(db: DbOrTx, listingId: string, start: Date, end: Date, now: Date, excludeHoldId?: string) {
  const [bookings, holds] = await Promise.all([
    db.rentalBooking.findMany({
      where: {
        listingId,
        startDate: { lt: end },
        endDate: { gt: start },
        // A booking stuck in PENDING_PAYMENT (e.g. the process died mid-checkout) stops blocking after 15 minutes.
        OR: [
          { status: { in: BLOCKING_BOOKING_STATUSES.filter((s) => s !== "PENDING_PAYMENT") } },
          { status: "PENDING_PAYMENT", createdAt: { gt: new Date(now.getTime() - STALE_PAYMENT_MS) } },
        ],
      },
      select: { startDate: true, endDate: true, quantity: true },
    }),
    db.bookingHold.findMany({
      where: {
        listingId,
        status: "ACTIVE",
        expiresAt: { gt: now },
        startDate: { lt: end },
        endDate: { gt: start },
        ...(excludeHoldId ? { id: { not: excludeHoldId } } : {}),
      },
      select: { startDate: true, endDate: true, quantity: true },
    }),
  ]);
  return [...bookings, ...holds];
}

export async function availableStock(db: DbOrTx, listing: { id: string; stockQuantity: number }, start: Date, end: Date, now = new Date(), excludeHoldId?: string) {
  const reservations = await activeReservations(db, listing.id, start, end, now, excludeHoldId);
  return listing.stockQuantity - peakReserved(reservations.map((r) => clip(r, start, end)));
}

const clip = (r: Reservation, start: Date, end: Date): Reservation => ({
  startDate: r.startDate < start ? start : r.startDate,
  endDate: r.endDate > end ? end : r.endDate,
  quantity: r.quantity,
});

/** Per-day availability for the booking calendar. */
export async function availabilityCalendar(db: DbOrTx, listing: { id: string; stockQuantity: number }, from: Date, days: number, now = new Date()) {
  const to = addDays(from, days);
  const reservations = await activeReservations(db, listing.id, from, to, now);
  return Array.from({ length: daysBetween(from, to) }, (_, i) => {
    const day = addDays(from, i);
    const next = addDays(day, 1);
    return { date: formatDayISO(day), available: Math.max(0, listing.stockQuantity - overlappingQuantity(reservations, day, next)) };
  });
}
