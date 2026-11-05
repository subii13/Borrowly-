import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { acceptOrder, checkoutPurchase, confirmPurchaseHandover } from "@/modules/purchases/service";
import { createDispute, processRefund, resolveDispute, startDisputeReview } from "@/modules/disputes/service";
import { createHold } from "@/modules/rentals/service";
import { day, key, makeListing, makeSeller, makeUser, resetDb, testDb as db } from "../support/fixtures";

beforeEach(resetDb);
afterAll(() => db.$disconnect());

async function setup(stock = 1) {
  const s = await makeSeller();
  const listing = await makeListing(s.seller.id, { stockQuantity: stock, purchaseEnabled: true, rentalEnabled: true, salePricePaise: 1_000_000 });
  return { s, listing };
}

describe("purchase engine", () => {
  it("sells a single-stock item exactly once under concurrency and marks it sold out", async () => {
    const { listing } = await setup(1);
    const buyers = await Promise.all(Array.from({ length: 5 }, () => makeUser()));
    const results = await Promise.allSettled(buyers.map((b) => checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: key() })));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const l = await db.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(l).toMatchObject({ stockQuantity: 0, status: "SOLD_OUT" });
    const late = await makeUser();
    await expect(checkoutPurchase(db, late.actor, { listingId: listing.id, idempotencyKey: key() })).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("is idempotent under concurrent retries with the same key", async () => {
    const { listing } = await setup(1);
    const b = await makeUser();
    const k = key();
    const [x, y] = await Promise.all([checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: k }), checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: k })]);
    expect(x.id).toBe(y.id);
    expect(await db.purchaseOrder.count()).toBe(1);
    expect(await db.payment.count()).toBe(1);
  });

  it("returns the unit to stock when payment fails", async () => {
    const { listing } = await setup(1);
    const b = await makeUser();
    const order = await checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: key(), simulate: "decline" });
    expect(order.status).toBe("PAYMENT_FAILED");
    expect(await db.listing.findUniqueOrThrow({ where: { id: listing.id } })).toMatchObject({ stockQuantity: 1, status: "ACTIVE" });
  });

  it("prevents duplicate open orders and self-purchase", async () => {
    const { s, listing } = await setup(3);
    const b = await makeUser();
    await checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: key() });
    await expect(checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: key() })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(checkoutPurchase(db, s.actor, { listingId: listing.id, idempotencyKey: key() })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("will not sell a unit that is already booked for a future rental", async () => {
    const { listing } = await setup(1);
    const renter = await makeUser();
    await createHold(db, renter.actor, { listingId: listing.id, startDate: day(5), endDate: day(7) });
    const buyer = await makeUser();
    await expect(checkoutPurchase(db, buyer.actor, { listingId: listing.id, idempotencyKey: key() })).rejects.toMatchObject({ code: "UNAVAILABLE" });
  });

  it("completes through accept → handover → receipt with server-side totals", async () => {
    const { s, listing } = await setup(1);
    const b = await makeUser();
    const o = await checkoutPurchase(db, b.actor, { listingId: listing.id, idempotencyKey: key() });
    expect(o).toMatchObject({ status: "PLACED", subtotalPaise: 1_000_000, serviceFeePaise: 20_000, totalPaise: 1_020_000, commissionPaise: 80_000, sellerNetPaise: 920_000 });
    await expect(confirmPurchaseHandover(db, b.actor, o.id, { photoKeys: [] })).rejects.toMatchObject({ code: "CONFLICT" });
    await acceptOrder(db, s.actor, o.id);
    await confirmPurchaseHandover(db, s.actor, o.id, { note: "Handed over with box", photoKeys: [] });
    const done = await confirmPurchaseHandover(db, b.actor, o.id, { photoKeys: [] });
    expect(done.status).toBe("COMPLETED");
  });
});

describe("disputes and refunds", () => {
  it("lets a party raise a dispute, an admin resolve it with a partial refund, and process the refund", async () => {
    const { listing } = await setup(1);
    const buyer = await makeUser();
    const stranger = await makeUser();
    const admin = await makeUser({ admin: true });
    const o = await checkoutPurchase(db, buyer.actor, { listingId: listing.id, idempotencyKey: key() });

    await expect(createDispute(db, stranger.actor, { purchaseOrderId: o.id }, { category: "DAMAGE", description: "I am not part of this order at all." })).rejects.toMatchObject({ code: "NOT_FOUND" });
    const d = await createDispute(db, buyer.actor, { purchaseOrderId: o.id }, { category: "CONDITION_MISMATCH", description: "The screen has a crack that was not in the listing." });
    await expect(createDispute(db, buyer.actor, { purchaseOrderId: o.id }, { category: "DAMAGE", description: "A second dispute for the same order." })).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(resolveDispute(db, buyer.actor, d.id, { outcome: "RESOLVED", refundDecision: "FULL", resolutionNote: "Customer tries to self-approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await startDisputeReview(db, admin.actor, d.id);
    await expect(resolveDispute(db, admin.actor, d.id, { outcome: "RESOLVED", refundDecision: "PARTIAL", refundAmountPaise: 5_000_000, resolutionNote: "Too large a refund" })).rejects.toMatchObject({ code: "VALIDATION" });
    await resolveDispute(db, admin.actor, d.id, { outcome: "RESOLVED", refundDecision: "PARTIAL", refundAmountPaise: 200_000, resolutionNote: "Seller confirmed the crack; partial refund." });

    const refund = await db.refund.findFirstOrThrow({ where: { disputeId: d.id } });
    expect(refund).toMatchObject({ amountPaise: 200_000, status: "PENDING" });
    expect((await db.payment.findFirstOrThrow({ where: { purchaseOrderId: o.id } })).status).toBe("REFUND_PENDING");
    await processRefund(db, admin.actor, refund.id);
    expect((await db.refund.findUniqueOrThrow({ where: { id: refund.id } })).status).toBe("PROCESSED");
    expect(await db.auditLog.count({ where: { entityId: d.id } })).toBeGreaterThanOrEqual(3);
  });
});
