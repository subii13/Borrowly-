import type { Db } from "@/lib/db";
import { numericCode, sha256 } from "@/lib/crypto";
import { AppError, conflict, invalid, notFound } from "@/lib/errors";
import { assertAdmin, assertSeller, type Actor } from "@/lib/permissions";
import { phone as phoneSchema, sellerProfileSchema } from "@/lib/validation";
import { audit, notify, sendDevMessage } from "@/modules/platform/service";

export async function becomeSeller(db: Db, actor: Actor, raw: unknown) {
  const input = sellerProfileSchema.parse(raw);
  if (actor.sellerId) throw conflict("You already have a seller profile");
  const profile = await db.sellerProfile.create({
    data: { userId: actor.id, ...input, bio: input.bio || null, pickupAddress: input.pickupAddress || null, phone: input.phone || null },
  });
  await audit(db, { actorId: actor.id, action: "seller.created", entityType: "SellerProfile", entityId: profile.id });
  return profile;
}

export async function updateSellerProfile(db: Db, actor: Actor | null, raw: unknown) {
  assertSeller(actor);
  const input = sellerProfileSchema.parse(raw);
  const current = await db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } });
  const phoneChanged = (input.phone || null) !== current.phone;
  const profile = await db.sellerProfile.update({
    where: { id: actor.sellerId },
    data: { ...input, bio: input.bio || null, pickupAddress: input.pickupAddress || null, phone: input.phone || null, ...(phoneChanged ? { phoneVerifiedAt: null } : {}) },
  });
  await audit(db, { actorId: actor.id, action: "seller.updated", entityType: "SellerProfile", entityId: profile.id });
  return profile;
}

/**
 * Phone verification boundary. Codes go to the development outbox; a production deployment
 * would plug an SMS provider (e.g. MSG91/Twilio) into sendDevMessage's place.
 */
export async function requestPhoneOtp(db: Db, actor: Actor | null) {
  assertSeller(actor);
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } });
  if (!seller.phone) throw invalid("Add a phone number to your seller profile first");
  phoneSchema.parse(seller.phone);
  const code = numericCode(6);
  await db.verificationToken.deleteMany({ where: { userId: actor.id, type: "PHONE_OTP" } });
  await db.verificationToken.create({ data: { userId: actor.id, type: "PHONE_OTP", tokenHash: sha256(`${actor.id}:${code}`), target: seller.phone, expiresAt: new Date(Date.now() + 10 * 60_000) } });
  await sendDevMessage(db, { channel: "SMS", to: seller.phone, subject: "Borrowly verification code", body: `Your Borrowly code is ${code}. It expires in 10 minutes.` });
}

export async function verifyPhoneOtp(db: Db, actor: Actor | null, code: string) {
  assertSeller(actor);
  const token = await db.verificationToken.findUnique({ where: { tokenHash: sha256(`${actor.id}:${code.trim()}`) } });
  if (!token || token.type !== "PHONE_OTP" || token.usedAt || token.expiresAt < new Date()) throw invalid("That code is invalid or has expired");
  await db.$transaction([
    db.verificationToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
    db.sellerProfile.update({ where: { id: actor.sellerId }, data: { phoneVerifiedAt: new Date() } }),
  ]);
}

/** Seller asks for review. Requires a verified email and phone; no identity documents are collected. */
export async function submitVerification(db: Db, actor: Actor | null, note: string) {
  assertSeller(actor);
  const [user, seller] = await Promise.all([db.user.findUniqueOrThrow({ where: { id: actor.id } }), db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } })]);
  if (!user.emailVerifiedAt) throw new AppError("VALIDATION", "Verify your email address first");
  if (!seller.phoneVerifiedAt) throw new AppError("VALIDATION", "Verify your phone number first");
  if (!["NOT_SUBMITTED", "REJECTED"].includes(seller.verificationStatus)) throw conflict("Verification is already " + seller.verificationStatus.toLowerCase());
  await db.$transaction(async (tx) => {
    await tx.sellerProfile.update({ where: { id: seller.id }, data: { verificationStatus: "PENDING", verificationSubmittedAt: new Date(), verificationNote: note.trim().slice(0, 600) || null } });
    const admins = await tx.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
    for (const a of admins) await notify(tx, a.id, { type: "seller.verification", title: "Seller awaiting verification", body: `${seller.displayName} submitted verification.`, link: "/admin/verification" });
    await audit(tx, { actorId: actor.id, action: "seller.verification_submitted", entityType: "SellerProfile", entityId: seller.id });
  });
}

export async function reviewSeller(db: Db, actor: Actor | null, sellerId: string, decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "REINSTATE", note: string) {
  assertAdmin(actor);
  const seller = await db.sellerProfile.findUnique({ where: { id: sellerId } });
  if (!seller) throw notFound("Seller");
  if ((decision === "REJECTED" || decision === "SUSPENDED") && note.trim().length < 5) throw invalid("Add a note explaining the decision");
  if ((decision === "VERIFIED" || decision === "REJECTED") && seller.verificationStatus !== "PENDING") throw conflict("Seller is not awaiting review");
  const status = decision === "REINSTATE" ? (seller.verifiedAt ? "VERIFIED" : "NOT_SUBMITTED") : decision;
  await db.$transaction(async (tx) => {
    await tx.sellerProfile.update({
      where: { id: sellerId },
      data: { verificationStatus: status, reviewNote: note.trim() || null, reviewedById: actor.id, ...(decision === "VERIFIED" ? { verifiedAt: new Date() } : {}) },
    });
    if (decision === "SUSPENDED") await tx.listing.updateMany({ where: { sellerId, status: "ACTIVE" }, data: { status: "INACTIVE" } });
    await notify(tx, seller.userId, {
      type: "seller.verification",
      title: { VERIFIED: "You're a verified seller", REJECTED: "Verification not approved", SUSPENDED: "Seller account suspended", REINSTATE: "Seller account reinstated" }[decision],
      body: note.trim() || "See your verification status for details.",
      link: "/seller/verification",
    });
    await audit(tx, { actorId: actor.id, action: `seller.${decision.toLowerCase()}`, entityType: "SellerProfile", entityId: sellerId, metadata: { note } });
  });
}
