import { z } from "zod";
import type { Db } from "@/lib/db";
import { conflict, notFound } from "@/lib/errors";
import { assertAdmin, type Actor } from "@/lib/permissions";
import { audit, notify } from "@/modules/platform/service";

export async function setUserStatus(db: Db, actor: Actor | null, userId: string, status: "ACTIVE" | "SUSPENDED") {
  assertAdmin(actor);
  if (userId === actor.id) throw conflict("You cannot change your own account status");
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  if (user.role === "ADMIN") throw conflict("Administrator accounts are managed outside the app");
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status } });
    if (status === "SUSPENDED") await tx.session.deleteMany({ where: { userId } });
    await notify(tx, userId, { type: "account.status", title: status === "SUSPENDED" ? "Account suspended" : "Account reactivated", body: "Contact support@borrowly.demo for details." });
    await audit(tx, { actorId: actor.id, action: `user.${status.toLowerCase()}`, entityType: "User", entityId: userId });
  });
}

export const settingsSchema = z.object({
  commissionBps: z.coerce.number().int().min(500, "Commission must be 5–10%").max(1000, "Commission must be 5–10%"),
  customerFeeBps: z.coerce.number().int().min(0).max(500, "Service fee must be at most 5%"),
  holdMinutes: z.coerce.number().int().min(5).max(60),
});

/** Changes apply to new transactions only; existing orders keep their snapshotted rates. */
export async function updateSettings(db: Db, actor: Actor | null, raw: unknown) {
  assertAdmin(actor);
  const input = settingsSchema.parse(raw);
  const before = await db.platformSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  await db.platformSetting.update({ where: { id: 1 }, data: { ...input, updatedById: actor.id } });
  await audit(db, { actorId: actor.id, action: "settings.updated", entityType: "PlatformSetting", entityId: "1", metadata: { before: { commissionBps: before.commissionBps, customerFeeBps: before.customerFeeBps, holdMinutes: before.holdMinutes }, after: input } });
}
