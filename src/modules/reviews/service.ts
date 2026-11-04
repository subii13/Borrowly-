import { Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { conflict, forbidden, invalid, notFound } from "@/lib/errors";
import type { Actor } from "@/lib/permissions";
import { reviewSchema } from "@/lib/validation";
import { audit, notify } from "@/modules/platform/service";

/** Only the customer of a COMPLETED rental or purchase may review it, once. */
export async function createReview(db: Db, actor: Actor, target: { bookingId?: string; purchaseOrderId?: string }, raw: unknown) {
  const input = reviewSchema.parse(raw);
  if (!!target.bookingId === !!target.purchaseOrderId) throw invalid("Review exactly one transaction");

  const txn = target.bookingId
    ? await db.rentalBooking.findUnique({ where: { id: target.bookingId }, include: { listing: { select: { title: true } }, seller: { select: { userId: true } } } })
    : await db.purchaseOrder.findUnique({ where: { id: target.purchaseOrderId! }, include: { listing: { select: { title: true } }, seller: { select: { userId: true } } } });
  if (!txn) throw notFound("Transaction");
  if (txn.customerId !== actor.id) throw forbidden("Only the customer can review this transaction");
  if (txn.status !== "COMPLETED") throw conflict("You can review once the transaction is completed");

  try {
    return await db.$transaction(async (tx) => {
      const review = await tx.review.create({
        data: { rating: input.rating, comment: input.comment, authorId: actor.id, sellerId: txn.sellerId, listingId: txn.listingId, bookingId: target.bookingId, purchaseOrderId: target.purchaseOrderId },
      });
      await tx.sellerProfile.update({ where: { id: txn.sellerId }, data: { ratingSum: { increment: input.rating }, ratingCount: { increment: 1 } } });
      await tx.listing.update({ where: { id: txn.listingId }, data: { ratingSum: { increment: input.rating }, ratingCount: { increment: 1 } } });
      await notify(tx, txn.seller.userId, { type: "review.received", title: `New ${input.rating}-star review`, body: `For ${txn.listing.title}: “${input.comment.slice(0, 80)}”`, link: `/sellers/${txn.sellerId}` });
      await audit(tx, { actorId: actor.id, action: "review.created", entityType: "Review", entityId: review.id });
      return review;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw conflict("You have already reviewed this transaction");
    throw err;
  }
}

export const ratingOf = (r: { ratingSum: number; ratingCount: number }) => (r.ratingCount ? Math.round((r.ratingSum / r.ratingCount) * 10) / 10 : null);
