"use server";

import { db } from "@/lib/db";
import { AppError, runAction } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { dateRangeSchema, paymentOutcome } from "@/lib/validation";
import { toggleFavourite } from "@/modules/listings/service";
import { checkoutRental, createHold, releaseHold } from "@/modules/rentals/service";
import { checkoutPurchase } from "@/modules/purchases/service";
import { z } from "zod";

async function actor() {
  const a = await currentActor();
  if (!a) throw new AppError("UNAUTHENTICATED", "Please log in to continue");
  return a;
}

export async function toggleFavouriteAction(listingId: string) {
  return runAction(async () => toggleFavourite(db, await actor(), listingId));
}

/** Reserves the chosen dates and returns the checkout URL. */
export async function createHoldAction(listingId: string, input: unknown) {
  return runAction(async () => {
    const a = await actor();
    await rateLimit("hold", 20, 60_000, a.id);
    const range = dateRangeSchema.parse(input);
    const hold = await createHold(db, a, { listingId, ...range });
    return `/checkout/rent/${hold.id}`;
  });
}

export async function releaseHoldAction(holdId: string) {
  return runAction(async () => releaseHold(db, await actor(), holdId));
}

const checkoutSchema = z.object({ idempotencyKey: z.string().min(16).max(80), outcome: paymentOutcome });

export async function payRentalAction(holdId: string, input: unknown) {
  return runAction(async () => {
    const a = await actor();
    await rateLimit("checkout", 15, 60_000, a.id);
    const { idempotencyKey, outcome } = checkoutSchema.parse(input);
    const b = await checkoutRental(db, a, { holdId, idempotencyKey, simulate: outcome });
    return { id: b.id, status: b.status };
  });
}

export async function payPurchaseAction(listingId: string, input: unknown) {
  return runAction(async () => {
    const a = await actor();
    await rateLimit("checkout", 15, 60_000, a.id);
    const { idempotencyKey, outcome } = checkoutSchema.parse(input);
    const o = await checkoutPurchase(db, a, { listingId, idempotencyKey, simulate: outcome });
    return { id: o.id, status: o.status };
  });
}
