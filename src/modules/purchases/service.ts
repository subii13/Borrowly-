import { Prisma, type PurchaseOrder } from "@prisma/client";
import type { Db, Tx } from "@/lib/db";
import { referenceCode } from "@/lib/crypto";
import { AppError, conflict, forbidden, notFound } from "@/lib/errors";
import { formatINR } from "@/lib/money";
import { requireParty, type Actor } from "@/lib/permissions";
import { todayIST } from "@/lib/dates";
import { audit, getSettings, notify } from "@/modules/platform/service";
import { paymentProvider } from "@/modules/payments/provider";
import { purchaseQuote } from "@/modules/pricing/pricing";
import { addEvidence } from "@/modules/handovers/service";
import { BLOCKING_BOOKING_STATUSES, lockListing, peakReserved } from "@/modules/rentals/availability";

const OPEN_STATUSES = ["PENDING_PAYMENT", "PLACED", "ACCEPTED", "HANDED_OVER"] as const;

function assertBuyable(listing: { status: string; purchaseEnabled: boolean; salePricePaise: number | null; sellerId: string }, actor: Actor) {
  if (listing.status === "SOLD_OUT") throw new AppError("UNAVAILABLE", "This item has sold out");
  if (listing.status !== "ACTIVE" || !listing.purchaseEnabled || listing.salePricePaise === null) throw new AppError("UNAVAILABLE", "This item is not for sale");
  if (actor.sellerId === listing.sellerId) throw forbidden("You cannot buy your own listing");
}

/** Units that can be sold now without breaking any future rental already booked. */
async function sellableUnits(tx: Tx, listing: { id: string; stockQuantity: number }, now: Date) {
  const today = todayIST(now);
  const [bookings, holds] = await Promise.all([
    tx.rentalBooking.findMany({ where: { listingId: listing.id, status: { in: BLOCKING_BOOKING_STATUSES }, endDate: { gt: today } }, select: { startDate: true, endDate: true, quantity: true } }),
    tx.bookingHold.findMany({ where: { listingId: listing.id, status: "ACTIVE", expiresAt: { gt: now }, endDate: { gt: today } }, select: { startDate: true, endDate: true, quantity: true } }),
  ]);
  return listing.stockQuantity - peakReserved([...bookings, ...holds]);
}

export async function quotePurchase(db: Db, actor: Actor, listingId: string, quantity = 1) {
  const listing = await db.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound("Listing");
  assertBuyable(listing, actor);
  const settings = await getSettings(db);
  return purchaseQuote({ unitPricePaise: listing.salePricePaise!, quantity, ...settings });
}

/**
 * Reserve inventory and create the order inside one locked transaction, then charge.
 * Stock is decremented atomically under the listing row lock, so a single-unit listing
 * can only ever be sold once. On payment failure the unit is returned to stock.
 */
export async function checkoutPurchase(db: Db, actor: Actor, input: { listingId: string; idempotencyKey: string; quantity?: number; simulate?: "approve" | "decline" }, now = new Date()) {
  const quantity = input.quantity ?? 1;
  const existing = await db.purchaseOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.customerId !== actor.id) throw notFound("Order");
    return existing;
  }

  let created: { order: PurchaseOrder; paymentId: string | null };
  try {
    created = await db.$transaction(async (tx) => {
      await lockListing(tx, input.listingId);
      // A concurrent request with the same key may have won the lock: hand back its order.
      const raced = await tx.purchaseOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (raced) {
        if (raced.customerId !== actor.id) throw notFound("Order");
        return { order: raced, paymentId: null };
      }
      const listing = await tx.listing.findUnique({ where: { id: input.listingId } });
      if (!listing) throw notFound("Listing");
      assertBuyable(listing, actor);
      const open = await tx.purchaseOrder.findFirst({ where: { listingId: listing.id, customerId: actor.id, status: { in: [...OPEN_STATUSES] } } });
      if (open) throw conflict(`You already have an open order (${open.code}) for this item`);
      if ((await sellableUnits(tx, listing, now)) < quantity) throw new AppError("UNAVAILABLE", "This item has sold out");

      const settings = await getSettings(tx);
      const q = purchaseQuote({ unitPricePaise: listing.salePricePaise!, quantity, ...settings });
      const remaining = listing.stockQuantity - quantity;
      await tx.listing.update({ where: { id: listing.id }, data: { stockQuantity: remaining, ...(remaining === 0 ? { status: "SOLD_OUT" } : {}) } });
      const order = await tx.purchaseOrder.create({
        data: {
          code: referenceCode("BO"),
          listingId: listing.id,
          customerId: actor.id,
          sellerId: listing.sellerId,
          quantity,
          unitPricePaise: q.unitPricePaise,
          subtotalPaise: q.subtotalPaise,
          serviceFeePaise: q.serviceFeePaise,
          totalPaise: q.totalPaise,
          customerFeeBps: q.customerFeeBps,
          commissionBps: q.commissionBps,
          commissionPaise: q.commissionPaise,
          sellerNetPaise: q.sellerNetPaise,
          idempotencyKey: input.idempotencyKey,
        },
      });
      const payment = await tx.payment.create({
        data: { provider: paymentProvider().name, amountPaise: q.totalPaise, payerId: actor.id, purchaseOrderId: order.id, idempotencyKey: `pay_${input.idempotencyKey}`, status: "PENDING" },
      });
      await audit(tx, { actorId: actor.id, action: "order.created", entityType: "PurchaseOrder", entityId: order.id, metadata: { totalPaise: q.totalPaise } });
      return { order, paymentId: payment.id };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.purchaseOrder.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again && again.customerId === actor.id) return again;
    }
    throw err;
  }

  const { order, paymentId } = created;
  if (!paymentId) return order;
  const result = await paymentProvider().charge({ amountPaise: order.totalPaise, idempotencyKey: `pay_${input.idempotencyKey}`, description: `Order ${order.code}`, simulate: input.simulate });

  return db.$transaction(async (tx) => {
    if (result.ok) {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "SUCCESS", providerRef: result.providerRef } });
      const updated = await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "PLACED" }, include: { listing: { include: { seller: true } } } });
      await notify(tx, updated.listing.seller.userId, { type: "order.placed", title: "New purchase order", body: `${updated.listing.title} was bought for ${formatINR(updated.subtotalPaise)}. Accept the order to arrange handover.`, link: `/seller/orders/${updated.id}` });
      await notify(tx, actor.id, { type: "order.paid", title: "Order placed", body: `${updated.code}: demo payment of ${formatINR(updated.totalPaise)} succeeded.`, link: `/account/purchases/${updated.id}` });
      await audit(tx, { actorId: actor.id, action: "payment.succeeded", entityType: "PurchaseOrder", entityId: order.id });
      const { listing: _l, ...plain } = updated;
      return plain;
    }
    await tx.payment.update({ where: { id: paymentId }, data: { status: "FAILED", failureReason: result.reason } });
    await restock(tx, order.listingId, order.quantity);
    await audit(tx, { actorId: actor.id, action: "payment.failed", entityType: "PurchaseOrder", entityId: order.id, metadata: { reason: result.reason } });
    return tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED", cancelReason: result.reason } });
  });
}

async function restock(tx: Tx, listingId: string, quantity: number) {
  await lockListing(tx, listingId);
  const l = await tx.listing.update({ where: { id: listingId }, data: { stockQuantity: { increment: quantity } } });
  if (l.status === "SOLD_OUT" && l.stockQuantity > 0) await tx.listing.update({ where: { id: listingId }, data: { status: "ACTIVE" } });
}

async function loadForParty(db: Db, actor: Actor, orderId: string) {
  const order = await db.purchaseOrder.findUnique({ where: { id: orderId }, include: { listing: { select: { title: true } }, seller: { select: { userId: true } } } });
  if (!order) throw notFound("Order");
  return { order, party: requireParty(actor, order) };
}

export async function acceptOrder(db: Db, actor: Actor, orderId: string) {
  const { order, party } = await loadForParty(db, actor, orderId);
  if (party !== "seller") throw forbidden("Only the seller can accept this order");
  return db.$transaction(async (tx) => {
    const fresh = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } });
    if (fresh.status !== "PLACED") throw conflict("This order has already been handled");
    const o = await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "ACCEPTED", acceptedAt: new Date() } });
    await notify(tx, order.customerId, { type: "order.accepted", title: "Order accepted", body: `The seller accepted ${order.code}. Pickup details are now visible.`, link: `/account/purchases/${o.id}` });
    await audit(tx, { actorId: actor.id, action: "order.accepted", entityType: "PurchaseOrder", entityId: o.id });
    return o;
  });
}

export async function cancelOrder(db: Db, actor: Actor, orderId: string, reason: string) {
  const { order, party } = await loadForParty(db, actor, orderId);
  if (party === "admin") throw forbidden("Admins resolve orders through disputes");
  return db.$transaction(async (tx) => {
    const fresh = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } });
    const allowed = party === "customer" ? ["PLACED"] : ["PLACED", "ACCEPTED"];
    if (!allowed.includes(fresh.status)) throw conflict("This order can no longer be cancelled");
    const o = await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason || `Cancelled by ${party}` } });
    await restock(tx, o.listingId, o.quantity);
    const payment = await tx.payment.findFirst({ where: { purchaseOrderId: o.id, status: "SUCCESS" } });
    if (payment) {
      await tx.refund.create({ data: { paymentId: payment.id, type: "CANCELLATION", status: "PROCESSED", amountPaise: payment.amountPaise, reason: `Order cancelled by ${party}`, createdById: actor.id, processedAt: new Date() } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
    }
    const other = party === "customer" ? order.seller.userId : order.customerId;
    await notify(tx, other, { type: "order.cancelled", title: "Order cancelled", body: `${order.code} for ${order.listing.title} was cancelled by the ${party}.`, link: party === "customer" ? `/seller/orders/${o.id}` : `/account/purchases/${o.id}` });
    await audit(tx, { actorId: actor.id, action: "order.cancelled", entityType: "PurchaseOrder", entityId: o.id, metadata: { party, reason } });
    return o;
  });
}

/** Seller hands the item over (ACCEPTED → HANDED_OVER); customer confirms receipt (→ COMPLETED). */
export async function confirmPurchaseHandover(db: Db, actor: Actor, orderId: string, evidence: { note?: string; photoKeys: string[] }) {
  const { order, party } = await loadForParty(db, actor, orderId);
  if (party === "admin") throw forbidden("Only the customer or seller can confirm");
  return db.$transaction(async (tx) => {
    const fresh = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } });
    const expected = party === "seller" ? "ACCEPTED" : "HANDED_OVER";
    if (fresh.status !== expected) throw conflict(party === "seller" ? "Accept the order before handing it over" : "The seller has not handed this item over yet");
    const handover = await tx.handover.upsert({ where: { purchaseOrderId_type: { purchaseOrderId: order.id, type: "HANDOVER" } }, update: {}, create: { purchaseOrderId: order.id, type: "HANDOVER" } });
    await addEvidence(tx, handover.id, actor.id, evidence);
    const now = new Date();
    if (party === "seller") {
      await tx.handover.update({ where: { id: handover.id }, data: { sellerConfirmedAt: now } });
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "HANDED_OVER", handedOverAt: now } });
      await notify(tx, order.customerId, { type: "order.handed_over", title: "Item handed over", body: `Please confirm you received ${order.listing.title}.`, link: `/account/purchases/${order.id}` });
    } else {
      await tx.handover.update({ where: { id: handover.id }, data: { customerConfirmedAt: now } });
      await tx.purchaseOrder.update({ where: { id: order.id }, data: { status: "COMPLETED", completedAt: now } });
      await notify(tx, order.seller.userId, { type: "order.completed", title: "Order completed", body: `${order.code}: the buyer confirmed receipt. Earnings updated.`, link: `/seller/orders/${order.id}` });
      await notify(tx, order.customerId, { type: "review.invite", title: "How was your purchase?", body: `Leave a review for ${order.listing.title}.`, link: `/account/purchases/${order.id}` });
    }
    await audit(tx, { actorId: actor.id, action: party === "seller" ? "order.handed_over" : "order.received", entityType: "PurchaseOrder", entityId: order.id });
    return tx.purchaseOrder.findUniqueOrThrow({ where: { id: order.id } });
  });
}
