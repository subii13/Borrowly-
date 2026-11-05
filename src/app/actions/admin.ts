"use server";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, runAction } from "@/lib/errors";
import { assertAdmin } from "@/lib/permissions";
import { currentActor } from "@/lib/session";
import { moderateListing } from "@/modules/listings/service";
import { reviewSeller } from "@/modules/sellers/service";
import { processRefund, resolveDispute, startDisputeReview } from "@/modules/disputes/service";
import { setUserStatus, updateSettings } from "@/modules/admin/service";
import { audit } from "@/modules/platform/service";
import { seedDemo } from "@/modules/demo/seed";

// Every admin action re-checks the role from the database-backed session.
async function admin() {
  const a = await currentActor();
  assertAdmin(a);
  return a;
}

export async function reviewSellerAction(sellerId: string, decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "REINSTATE", note?: string) {
  return runAction(async () => reviewSeller(db, await admin(), sellerId, decision, note ?? ""), "Seller updated");
}

export async function moderateListingAction(listingId: string, action: "suspend" | "reinstate", note?: string) {
  return runAction(async () => moderateListing(db, await admin(), listingId, action, note ?? ""), action === "suspend" ? "Listing suspended" : "Listing reinstated");
}

export async function setUserStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  return runAction(async () => setUserStatus(db, await admin(), userId, status), status === "SUSPENDED" ? "User suspended" : "User reactivated");
}

export async function startDisputeReviewAction(disputeId: string) {
  return runAction(async () => startDisputeReview(db, await admin(), disputeId), "Marked under review");
}

export async function resolveDisputeAction(disputeId: string, input: unknown) {
  return runAction(async () => void (await resolveDispute(db, await admin(), disputeId, input)), "Decision recorded");
}

export async function processRefundAction(refundId: string) {
  return runAction(async () => void (await processRefund(db, await admin(), refundId)), "Refund marked as processed");
}

export async function updateSettingsAction(input: unknown) {
  return runAction(async () => updateSettings(db, await admin(), input), "Settings saved");
}

/** Restores the original demonstration dataset. Admin-only, and only when DEMO_MODE=true. */
export async function resetDemoAction() {
  return runAction(async () => {
    const a = await admin();
    if (!env.demoMode) throw new AppError("FORBIDDEN", "Demo reset is disabled on this deployment");
    await seedDemo(db);
    await audit(db, { actorId: null, action: "demo.reset", entityType: "System", entityId: "seed", metadata: { requestedBy: a.id } });
  }, "Demo data restored. Please sign in again.");
}
