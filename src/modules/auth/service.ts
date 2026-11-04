import type { Db } from "@/lib/db";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/password";
import { randomToken, sha256 } from "@/lib/crypto";
import { AppError, conflict, invalid } from "@/lib/errors";
import { forgotSchema, loginSchema, password as passwordSchema, registerSchema, resetSchema } from "@/lib/validation";
import { audit, sendDevMessage } from "@/modules/platform/service";

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";

async function issueToken(db: Db, userId: string, type: "EMAIL_VERIFY" | "PASSWORD_RESET", minutes: number) {
  const token = randomToken();
  await db.verificationToken.deleteMany({ where: { userId, type, usedAt: null } });
  await db.verificationToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + minutes * 60_000) } });
  return token;
}

export async function sendVerificationEmail(db: Db, user: { id: string; email: string; name: string }) {
  const token = await issueToken(db, user.id, "EMAIL_VERIFY", 24 * 60);
  await sendDevMessage(db, {
    channel: "EMAIL",
    to: user.email,
    subject: "Verify your Borrowly email",
    body: `Hi ${user.name}, confirm your email: ${appUrl()}/verify-email?token=${token}`,
  });
}

export async function registerUser(db: Db, raw: unknown) {
  const input = registerSchema.parse(raw);
  if (await db.user.findUnique({ where: { email: input.email } })) throw conflict("An account with this email already exists");
  const user = await db.user.create({
    data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password), profile: { create: {} } },
  });
  await sendVerificationEmail(db, user);
  await audit(db, { actorId: user.id, action: "user.registered", entityType: "User", entityId: user.id });
  return user;
}

export async function authenticate(db: Db, raw: unknown) {
  const input = loginSchema.parse(raw);
  const user = await db.user.findUnique({ where: { email: input.email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !ok) throw new AppError("UNAUTHENTICATED", "Incorrect email or password");
  if (user.status !== "ACTIVE") throw new AppError("FORBIDDEN", "This account is suspended. Contact support.");
  return user;
}

export async function verifyEmail(db: Db, token: string) {
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== "EMAIL_VERIFY" || record.usedAt || record.expiresAt < new Date()) throw invalid("This verification link is invalid or has expired");
  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ]);
}

/** Always succeeds from the caller's view so account existence is not revealed. */
export async function requestPasswordReset(db: Db, raw: unknown) {
  const { email } = forgotSchema.parse(raw);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || user.status !== "ACTIVE") return;
  const token = await issueToken(db, user.id, "PASSWORD_RESET", 30);
  await sendDevMessage(db, { channel: "EMAIL", to: user.email, subject: "Reset your Borrowly password", body: `Reset your password (valid 30 minutes): ${appUrl()}/reset-password?token=${token}` });
}

export async function resetPassword(db: Db, raw: unknown) {
  const input = resetSchema.parse(raw);
  const record = await db.verificationToken.findUnique({ where: { tokenHash: sha256(input.token) } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) throw invalid("This reset link is invalid or has expired");
  await db.$transaction([
    db.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(input.password) } }),
    // Sign out everywhere after a reset.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  await audit(db, { actorId: record.userId, action: "user.password_reset", entityType: "User", entityId: record.userId });
}

export async function changePassword(db: Db, userId: string, current: string, next: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(current, user.passwordHash))) throw invalid("Your current password is incorrect", { current: "Incorrect password" });
  passwordSchema.parse(next);
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
  await audit(db, { actorId: userId, action: "user.password_changed", entityType: "User", entityId: userId });
}
