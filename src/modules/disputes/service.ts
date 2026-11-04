import type { Db } from "@/lib/db";
import { referenceCode } from "@/lib/crypto";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { assertAdmin, partyOf, type Actor } from "@/lib/permissions";
import { disputeSchema } from "@/lib/validation";
import { audit, notify } from "@/modules/platform/service";
import { z } from "zod";

async function loadTransaction(db: Db, target: { bookingId?: string; purchaseOrderId?: string }) {
  if (target.bookingId) {
    const b = await db.rentalBooking.findUnique({ where: { id: target.bookingId }, include: { seller: { select: { userId: true } } } });
    return b && { ...b, kind: "booking" as const, open: !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(b.status) };
  }
  if (target.purchaseOrderId) {
    const o = await db.purchaseOrder.findUnique({ where: { id: target.purchaseOrderId }, include: { seller: { select: { userId: true } } } });
    return o && { ...o, kind: "order" as const, open: !["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(o.status) };
  }
  return null;
}

export async function createDispute(db: Db, actor: Actor, target: { bookingId?: string; purchaseOrderId?: string }, raw: unknown) {
  const input = disputeSchema.parse(raw);
  const txn = await loadTransaction(db, target);
  const party = txn && partyOf(actor, txn);
  if (!txn || !party || party === "admin") throw notFound("Transaction");
  if (!txn.open) throw conflict("Disputes can only be raised on paid transactions");
  for (const key of input.evidenceKeys) if (!key.startsWith(`disputes/${actor.id}/`)) throw forbidden("Invalid evidence file");

  const dup = await db.dispute.findFirst({
    where: { raisedById: actor.id, status: { in: ["OPEN", "UNDER_REVIEW"] }, ...(txn.kind === "booking" ? { bookingId: txn.id } : { purchaseOrderId: txn.id }) },
  });
  if (dup) throw conflict(`You already have an open dispute (${dup.code}) for this transaction`);

  return db.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        code: referenceCode("DS"),
        category: input.category,
        description: input.description,
        raisedById: actor.id,
        bookingId: txn.kind === "booking" ? txn.id : null,
        purchaseOrderId: txn.kind === "order" ? txn.id : null,
        evidence: { create: input.evidenceKeys.map((storageKey) => ({ storageKey, uploadedById: actor.id })) },
      },
    });
    const other = party === "customer" ? txn.seller.userId : txn.customerId;
    await notify(tx, other, { type: "dispute.opened", title: "A dispute was raised", body: `${d.code} on ${txn.code}. Borrowly support will review it.`, link: party === "customer" ? `/seller` : `/account/disputes/${d.id}` });
    await notify(tx, actor.id, { type: "dispute.opened", title: "Dispute submitted", body: `${d.code} has been submitted for review.`, link: `/account/disputes/${d.id}` });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    for (const a of admins) await notify(tx, a.id, { type: "dispute.opened", title: "New dispute", body: `${d.code} needs review.`, link: `/admin/disputes/${d.id}` });
    await audit(tx, { actorId: actor.id, action: "dispute.opened", entityType: "Dispute", entityId: d.id, metadata: { category: input.category } });
    return d;
  });
}

export async function addDisputeNote(db: Db, actor: Actor, disputeId: string, note: string, evidenceKeys: string[] = []) {
  const d = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!d) throw notFound("Dispute");
  const txn = await loadTransaction(db, { bookingId: d.bookingId ?? undefined, purchaseOrderId: d.purchaseOrderId ?? undefined });
  if (!txn || !partyOf(actor, txn)) throw notFound("Dispute");
  if (["RESOLVED", "REJECTED"].includes(d.status)) throw conflict("This dispute is closed");
  for (const key of evidenceKeys) if (!key.startsWith(`disputes/${actor.id}/`)) throw forbidden("Invalid evidence file");
  const text = note.trim().slice(0, 1000);
  if (!text && !evidenceKeys.length) throw invalid("Add a note or a photo");
  await db.disputeEvidence.createMany({
    data: [...(text ? [{ disputeId, uploadedById: actor.id, note: text }] : []), ...evidenceKeys.map((storageKey) => ({ disputeId, uploadedById: actor.id, storageKey }))],
  });
  await audit(db, { actorId: actor.id, action: "dispute.evidence_added", entityType: "Dispute", entityId: disputeId });
}

export async function startDisputeReview(db: Db, actor: Actor, disputeId: string) {
  assertAdmin(actor);
  const d = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!d) throw notFound("Dispute");
  if (d.status !== "OPEN") throw conflict("Dispute is not open");
  await db.$transaction(async (tx) => {
    await tx.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });
    await notify(tx, d.raisedById, { type: "dispute.review", title: "Dispute under review", body: `${d.code} is being investigated by Borrowly support.`, link: `/account/disputes/${d.id}` });
    await audit(tx, { actorId: actor.id, action: "dispute.review_started", entityType: "Dispute", entityId: disputeId });
  });
}

export const resolveSchema = z.object({
  outcome: z.enum(["RESOLVED", "REJECTED"]),
  refundDecision: z.enum(["NONE", "PARTIAL", "FULL"]),
  refundAmountPaise: z.coerce.number().int().min(0).default(0),
  resolutionNote: z.string().trim().min(10, "Explain the decision in at least 10 characters").max(2000),
});

/** Admin decision. Refunds are recorded as PENDING and processed separately from the Refunds screen. */
export async function resolveDispute(db: Db, actor: Actor, disputeId: string, raw: unknown) {
  assertAdmin(actor);
  const input = resolveSchema.parse(raw);
  const d = await db.dispute.findUnique({ where: { id: disputeId } });
  if (!d) throw notFound("Dispute");
  if (["RESOLVED", "REJECTED"].includes(d.status)) throw conflict("Dispute already closed");
  const payment = await db.payment.findFirst({
    where: { ...(d.bookingId ? { bookingId: d.bookingId } : { purchaseOrderId: d.purchaseOrderId }), status: { in: ["SUCCESS", "REFUND_PENDING"] } },
    include: { refunds: true },
  });
  let amount = 0;
  if (input.refundDecision !== "NONE") {
    if (!payment) throw conflict("There is no captured payment to refund");
    const refunded = payment.refunds.reduce((s, r) => s + r.amountPaise, 0);
    const refundable = payment.amountPaise - refunded;
    amount = input.refundDecision === "FULL" ? refundable : input.refundAmountPaise;
    if (amount <= 0 || amount > refundable) throw invalid(`Refund must be between ₹0.01 and the refundable balance`, { refundAmountPaise: "Invalid amount" });
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: disputeId },
      data: { status: input.outcome, refundDecision: input.refundDecision, resolutionNote: input.resolutionNote, resolvedById: actor.id, resolvedAt: new Date() },
    });
    if (amount > 0 && payment) {
      await tx.refund.create({ data: { paymentId: payment.id, type: "DISPUTE", status: "PENDING", amountPaise: amount, reason: `Dispute ${d.code}`, disputeId: d.id, createdById: actor.id } });
      await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUND_PENDING" } });
    }
    await notify(tx, d.raisedById, { type: "dispute.resolved", title: "Dispute decision", body: `${d.code}: ${input.resolutionNote.slice(0, 120)}`, link: `/account/disputes/${d.id}` });
    await audit(tx, { actorId: actor.id, action: "dispute.resolved", entityType: "Dispute", entityId: disputeId, metadata: { outcome: input.outcome, refundDecision: input.refundDecision, amountPaise: amount } });
    return updated;
  });
}

/** Marks a recorded refund as processed (simulated provider call). */
export async function processRefund(db: Db, actor: Actor, refundId: string) {
  assertAdmin(actor);
  const r = await db.refund.findUnique({ where: { id: refundId }, include: { payment: { include: { refunds: true } } } });
  if (!r) throw notFound("Refund");
  if (r.status === "PROCESSED") throw conflict("Refund already processed");
  return db.$transaction(async (tx) => {
    await tx.refund.update({ where: { id: refundId }, data: { status: "PROCESSED", processedAt: new Date() } });
    const totalRefunded = r.payment.refunds.reduce((s, x) => s + x.amountPaise, 0);
    const stillPending = r.payment.refunds.some((x) => x.id !== refundId && x.status === "PENDING");
    await tx.payment.update({ where: { id: r.paymentId }, data: { status: stillPending ? "REFUND_PENDING" : totalRefunded >= r.payment.amountPaise ? "REFUNDED" : "SUCCESS" } });
    await notify(tx, r.payment.payerId, { type: "refund.processed", title: "Refund processed (demo)", body: `A refund was recorded against your payment. No real money moves in the demo.`, link: `/account/transactions` });
    await audit(tx, { actorId: actor.id, action: "refund.processed", entityType: "Refund", entityId: refundId, metadata: { amountPaise: r.amountPaise } });
  });
}
