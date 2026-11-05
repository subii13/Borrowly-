"use server";

import { db } from "@/lib/db";
import { AppError, runAction } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { evidenceSchema } from "@/lib/validation";
import * as rentals from "@/modules/rentals/service";
import * as purchases from "@/modules/purchases/service";
import { createReview } from "@/modules/reviews/service";
import { addDisputeNote, createDispute } from "@/modules/disputes/service";
import { correctEvidence } from "@/modules/handovers/service";

async function actor() {
  const a = await currentActor();
  if (!a) throw new AppError("UNAUTHENTICATED", "Please log in");
  return a;
}

export async function respondBookingAction(bookingId: string, decision: "confirm" | "decline", reason?: string) {
  return runAction(async () => void (await rentals.sellerRespond(db, await actor(), bookingId, decision, reason)), decision === "confirm" ? "Booking confirmed" : "Booking declined and refunded");
}

export async function cancelBookingAction(bookingId: string, reason?: string) {
  return runAction(async () => void (await rentals.cancelBooking(db, await actor(), bookingId, reason ?? "")), "Booking cancelled and refunded");
}

export async function confirmRentalStepAction(bookingId: string, type: "HANDOVER" | "RETURN", input: unknown) {
  return runAction(async () => {
    const ev = evidenceSchema.parse(input);
    await rentals.confirmRentalStep(db, await actor(), bookingId, type, { note: ev.note || undefined, photoKeys: ev.photoKeys });
  }, type === "HANDOVER" ? "Handover confirmed" : "Return confirmed");
}

export async function acceptOrderAction(orderId: string) {
  return runAction(async () => void (await purchases.acceptOrder(db, await actor(), orderId)), "Order accepted");
}

export async function cancelOrderAction(orderId: string, reason?: string) {
  return runAction(async () => void (await purchases.cancelOrder(db, await actor(), orderId, reason ?? "")), "Order cancelled and refunded");
}

export async function confirmPurchaseHandoverAction(orderId: string, input: unknown) {
  return runAction(async () => {
    const ev = evidenceSchema.parse(input);
    await purchases.confirmPurchaseHandover(db, await actor(), orderId, { note: ev.note || undefined, photoKeys: ev.photoKeys });
  }, "Confirmed");
}

export async function reviewAction(target: { bookingId?: string; purchaseOrderId?: string }, input: unknown) {
  return runAction(async () => void (await createReview(db, await actor(), target, input)), "Thanks for your review");
}

export async function disputeAction(target: { bookingId?: string; purchaseOrderId?: string }, input: unknown) {
  return runAction(async () => (await createDispute(db, await actor(), target, input)).id, "Dispute submitted");
}

export async function disputeNoteAction(disputeId: string, note?: string) {
  return runAction(async () => addDisputeNote(db, await actor(), disputeId, note ?? ""), "Added to the dispute");
}

export async function correctEvidenceAction(evidenceId: string, note?: string) {
  return runAction(async () => void (await correctEvidence(db, await actor(), evidenceId, note ?? "")), "Correction recorded");
}

export async function markNotificationsReadAction() {
  return runAction(async () => {
    const a = await actor();
    await db.notification.updateMany({ where: { userId: a.id, readAt: null }, data: { readAt: new Date() } });
  }, "All caught up");
}
