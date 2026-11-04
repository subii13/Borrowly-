import type { Prisma } from "@prisma/client";
import type { Db } from "@/lib/db";
import { conflict, forbidden, notFound } from "@/lib/errors";
import { partyOf, type Actor } from "@/lib/permissions";
import { audit } from "@/modules/platform/service";

/** Evidence is append-only. Photo keys must have been uploaded by this user. */
export async function addEvidence(tx: Prisma.TransactionClient, handoverId: string, userId: string, evidence: { note?: string; photoKeys: string[]; correctsId?: string }) {
  for (const key of evidence.photoKeys) {
    if (!key.startsWith(`evidence/${userId}/`)) throw forbidden("Invalid evidence photo");
    await tx.handoverEvidence.create({ data: { handoverId, uploadedById: userId, kind: "PHOTO", storageKey: key, correctsId: evidence.correctsId } });
  }
  if (evidence.note?.trim()) await tx.handoverEvidence.create({ data: { handoverId, uploadedById: userId, kind: "NOTE", note: evidence.note.trim(), correctsId: evidence.correctsId } });
}

/** Loads a handover and checks the actor is a participant (or admin). */
async function handoverForActor(db: Db | Prisma.TransactionClient, actor: Actor, handoverId: string) {
  const h = await db.handover.findUnique({
    where: { id: handoverId },
    include: { booking: { select: { customerId: true, sellerId: true } }, purchaseOrder: { select: { customerId: true, sellerId: true } } },
  });
  const txn = h?.booking ?? h?.purchaseOrder;
  if (!h || !txn || !partyOf(actor, txn)) throw notFound("Handover");
  return h;
}

/**
 * Submitted evidence is never edited. A correction is a new note linked to the original,
 * and is recorded in the audit log.
 */
export async function correctEvidence(db: Db, actor: Actor, evidenceId: string, note: string) {
  const original = await db.handoverEvidence.findUnique({ where: { id: evidenceId } });
  if (!original) throw notFound("Evidence");
  if (original.uploadedById !== actor.id) throw forbidden("You can only correct your own evidence");
  if (!note.trim()) throw conflict("Write the correction");
  await handoverForActor(db, actor, original.handoverId);
  return db.$transaction(async (tx) => {
    const created = await tx.handoverEvidence.create({ data: { handoverId: original.handoverId, uploadedById: actor.id, kind: "NOTE", note: note.trim().slice(0, 1000), correctsId: original.id } });
    await audit(tx, { actorId: actor.id, action: "evidence.corrected", entityType: "HandoverEvidence", entityId: original.id, metadata: { correctionId: created.id } });
    return created;
  });
}

/** Authorises access to a private evidence photo. Returns the storage key. */
export async function evidencePhotoKey(db: Db, actor: Actor, evidenceId: string) {
  const ev = await db.handoverEvidence.findUnique({ where: { id: evidenceId } });
  if (!ev?.storageKey) throw notFound("Evidence");
  await handoverForActor(db, actor, ev.handoverId);
  return ev.storageKey;
}
