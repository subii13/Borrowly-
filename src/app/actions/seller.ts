"use server";

import { db } from "@/lib/db";
import { AppError, runAction } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import * as listings from "@/modules/listings/service";
import * as sellers from "@/modules/sellers/service";

async function actor() {
  const a = await currentActor();
  if (!a) throw new AppError("UNAUTHENTICATED", "Please log in");
  return a;
}

export async function becomeSellerAction(input: unknown) {
  return runAction(async () => void (await sellers.becomeSeller(db, await actor(), input)), "Seller profile created");
}

export async function updateSellerProfileAction(input: unknown) {
  return runAction(async () => void (await sellers.updateSellerProfile(db, await actor(), input)), "Seller profile saved");
}

export async function createListingAction(input: unknown) {
  return runAction(async () => {
    const a = await actor();
    await rateLimit("listing", 20, 60_000, a.id);
    return (await listings.createListing(db, a, input)).id;
  });
}

export async function updateListingAction(listingId: string, input: unknown) {
  return runAction(async () => (await listings.updateListing(db, await actor(), listingId, input)).id);
}

export async function setListingStatusAction(listingId: string, status: "ACTIVE" | "INACTIVE" | "DRAFT") {
  return runAction(async () => void (await listings.setListingStatus(db, await actor(), listingId, status)), status === "ACTIVE" ? "Listing is live" : "Listing updated");
}

export async function requestOtpAction() {
  return runAction(async () => {
    const a = await actor();
    await rateLimit("otp", 3, 60_000, a.id);
    await sellers.requestPhoneOtp(db, a);
  }, "Code sent — check the development outbox");
}

export async function verifyOtpAction(code?: string) {
  return runAction(async () => sellers.verifyPhoneOtp(db, await actor(), code ?? ""), "Phone verified");
}

export async function submitVerificationAction(note?: string) {
  return runAction(async () => sellers.submitVerification(db, await actor(), note ?? ""), "Submitted for review");
}
