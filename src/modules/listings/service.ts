import type { ListingStatus, Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import { rupeesToPaise } from "@/lib/money";
import { assertAdmin, assertSeller, type Actor } from "@/lib/permissions";
import { listingSchema } from "@/lib/validation";
import { audit, notify } from "@/modules/platform/service";
import { publicUrl } from "@/lib/storage";

async function resolveImages(db: Db, actor: Actor, listingId: string | null, images: { id?: string; storageKey?: string; url: string }[]) {
  const existing = listingId ? await db.listingImage.findMany({ where: { listingId } }) : [];
  const byId = new Map(existing.map((i) => [i.id, i]));
  return images.map((img, i) => {
    if (img.id) {
      const found = byId.get(img.id);
      if (!found) throw invalid("An image no longer exists — please re-upload it");
      return { url: found.url, storageKey: found.storageKey, width: found.width, height: found.height, sortOrder: i };
    }
    // New uploads: the key must belong to this user; the URL is derived server-side, never trusted.
    if (!img.storageKey?.startsWith(`listings/${actor.id}/`)) throw forbidden("Invalid image upload");
    return { url: publicUrl(img.storageKey), storageKey: img.storageKey, width: 1200, height: 900, sortOrder: i };
  });
}

function toData(input: ReturnType<typeof listingSchema.parse>) {
  const opt = (v?: string) => (v ? rupeesToPaise(v) : null);
  return {
    title: input.title,
    description: input.description,
    categoryId: input.categoryId,
    brand: input.brand || null,
    model: input.model || null,
    condition: input.condition,
    area: input.area,
    pincode: input.pincode,
    rentalEnabled: input.rentalEnabled,
    purchaseEnabled: input.purchaseEnabled,
    dailyRatePaise: input.rentalEnabled ? opt(input.dailyRate) : null,
    depositPaise: input.rentalEnabled ? (opt(input.deposit) ?? 0) : null,
    salePricePaise: input.purchaseEnabled ? opt(input.salePrice) : null,
    stockQuantity: input.stockQuantity,
    minRentalDays: input.minRentalDays,
    maxRentalDays: input.maxRentalDays,
  };
}

async function assertCanPublish(db: Db, sellerId: string) {
  const seller = await db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } });
  if (seller.verificationStatus === "SUSPENDED" || seller.verificationStatus === "REJECTED")
    throw forbidden("Your seller account cannot publish listings right now. See Verification status.");
}

export async function createListing(db: Db, actor: Actor | null, raw: unknown) {
  assertSeller(actor);
  const input = listingSchema.parse(raw);
  if (!(await db.category.findUnique({ where: { id: input.categoryId } }))) throw invalid("Choose a category", { categoryId: "Choose a category" });
  if (input.publish) await assertCanPublish(db, actor.sellerId);
  const images = await resolveImages(db, actor, null, input.images);
  const listing = await db.listing.create({
    data: {
      ...toData(input),
      sellerId: actor.sellerId,
      status: input.publish ? "ACTIVE" : "DRAFT",
      publishedAt: input.publish ? new Date() : null,
      images: { create: images.map((img) => ({ ...img, alt: input.title })) },
    },
  });
  await audit(db, { actorId: actor.id, action: "listing.created", entityType: "Listing", entityId: listing.id, metadata: { status: listing.status } });
  return listing;
}

async function ownListing(db: Db, actor: Actor, listingId: string) {
  assertSeller(actor);
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { images: true } });
  if (!listing || listing.sellerId !== actor.sellerId) throw notFound("Listing");
  return listing;
}

export async function updateListing(db: Db, actor: Actor | null, listingId: string, raw: unknown) {
  assertSeller(actor);
  const listing = await ownListing(db, actor, listingId);
  if (listing.status === "SUSPENDED") throw forbidden("This listing is suspended by Borrowly moderation");
  const input = listingSchema.parse(raw);
  if (input.publish) await assertCanPublish(db, actor.sellerId);
  const images = await resolveImages(db, actor, listing.id, input.images);
  const data = toData(input);
  const status: ListingStatus = input.publish ? (data.stockQuantity > 0 ? "ACTIVE" : "SOLD_OUT") : listing.status === "ACTIVE" ? "ACTIVE" : listing.status === "SOLD_OUT" ? "SOLD_OUT" : "DRAFT";
  const updated = await db.$transaction(async (tx) => {
    await tx.listingImage.deleteMany({ where: { listingId: listing.id } });
    return tx.listing.update({
      where: { id: listing.id },
      data: { ...data, status, publishedAt: listing.publishedAt ?? (status === "ACTIVE" ? new Date() : null), images: { create: images.map((img) => ({ ...img, alt: input.title })) } },
    });
  });
  await audit(db, { actorId: actor.id, action: "listing.updated", entityType: "Listing", entityId: listing.id });
  return updated;
}

/** Seller-controlled status changes. SUSPENDED and SOLD_OUT are system/admin states. */
export async function setListingStatus(db: Db, actor: Actor | null, listingId: string, status: "ACTIVE" | "INACTIVE" | "DRAFT") {
  assertSeller(actor);
  const listing = await ownListing(db, actor, listingId);
  if (listing.status === "SUSPENDED") throw forbidden("This listing is suspended by Borrowly moderation");
  if (status === "ACTIVE") {
    await assertCanPublish(db, actor.sellerId);
    if (listing.stockQuantity < 1) throw conflict("Add stock before activating");
    if (!listing.images.length) throw conflict("Add at least one photo before publishing");
  }
  const updated = await db.listing.update({ where: { id: listing.id }, data: { status, publishedAt: listing.publishedAt ?? (status === "ACTIVE" ? new Date() : null) } });
  await audit(db, { actorId: actor.id, action: `listing.${status.toLowerCase()}`, entityType: "Listing", entityId: listing.id });
  return updated;
}

export async function moderateListing(db: Db, actor: Actor | null, listingId: string, action: "suspend" | "reinstate", note: string) {
  assertAdmin(actor);
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { seller: true } });
  if (!listing) throw notFound("Listing");
  if (action === "suspend" && note.trim().length < 5) throw invalid("Give the seller a reason");
  const status: ListingStatus = action === "suspend" ? "SUSPENDED" : listing.stockQuantity > 0 ? "INACTIVE" : "SOLD_OUT";
  await db.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status, moderationNote: action === "suspend" ? note.trim() : null } });
    await notify(tx, listing.seller.userId, {
      type: "listing.moderated",
      title: action === "suspend" ? "Listing suspended" : "Listing reinstated",
      body: action === "suspend" ? `“${listing.title}” was suspended: ${note.trim()}` : `“${listing.title}” was reinstated. You can activate it again.`,
      link: `/seller/listings`,
    });
    await audit(tx, { actorId: actor.id, action: `listing.${action}`, entityType: "Listing", entityId: listingId, metadata: { note } });
  });
}

export async function toggleFavourite(db: Db, actor: Actor, listingId: string) {
  const key = { userId_listingId: { userId: actor.id, listingId } };
  const existing = await db.favourite.findUnique({ where: key });
  if (existing) {
    await db.favourite.delete({ where: key });
    return false;
  }
  if (!(await db.listing.findUnique({ where: { id: listingId }, select: { id: true } }))) throw notFound("Listing");
  await db.favourite.create({ data: { userId: actor.id, listingId } });
  return true;
}

export const detailInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  category: true,
  seller: { select: { id: true, displayName: true, sellerType: true, bio: true, area: true, verificationStatus: true, ratingSum: true, ratingCount: true, createdAt: true, userId: true } },
} satisfies Prisma.ListingInclude;
