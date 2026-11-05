import { db } from "@/lib/db";
import { currentActor } from "@/lib/session";
import { getObject } from "@/lib/storage";
import { partyOf } from "@/lib/permissions";
import { evidencePhotoKey } from "@/modules/handovers/service";

/**
 * Private evidence photos (handover/return and dispute). Only the two transaction parties and
 * administrators may view them. ?kind=dispute selects dispute evidence.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await currentActor();
  if (!actor) return new Response("Not found", { status: 404 });
  const { id } = await params;
  let key: string | null = null;
  try {
    if (new URL(req.url).searchParams.get("kind") === "dispute") {
      const ev = await db.disputeEvidence.findUnique({ where: { id }, include: { dispute: { include: { booking: true, purchaseOrder: true } } } });
      const txn = ev?.dispute.booking ?? ev?.dispute.purchaseOrder;
      if (ev?.storageKey && txn && partyOf(actor, txn)) key = ev.storageKey;
    } else {
      key = await evidencePhotoKey(db, actor, id);
    }
  } catch {
    key = null;
  }
  const data = key ? await getObject(key, "private") : null;
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
