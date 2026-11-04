import type { Prisma } from "@prisma/client";
import type { DbOrTx } from "@/lib/db";

/** Business rules that admins can change without a deploy (commission, fees, hold length). */
export async function getSettings(db: DbOrTx) {
  return db.platformSetting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

export async function audit(
  db: DbOrTx,
  entry: { actorId: string | null; action: string; entityType: string; entityId: string; metadata?: Prisma.InputJsonValue },
) {
  await db.auditLog.create({ data: entry });
}

export async function notify(db: DbOrTx, userId: string, n: { type: string; title: string; body: string; link?: string }) {
  await db.notification.create({ data: { userId, ...n } });
}

/** Writes to the development outbox. Swap for a real email/SMS provider in production. */
export async function sendDevMessage(db: DbOrTx, msg: { channel: "EMAIL" | "SMS"; to: string; subject: string; body: string }) {
  await db.devMessage.create({ data: msg });
  if (process.env.NODE_ENV !== "test") console.info(`[outbox:${msg.channel}] to=${msg.to} — ${msg.subject}`);
}
