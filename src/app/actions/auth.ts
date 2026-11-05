"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { AppError, runAction } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { AREA_NAMES } from "@/lib/constants";
import { profileSchema } from "@/lib/validation";
import * as auth from "@/modules/auth/service";
import { audit } from "@/modules/platform/service";

/** Only allow same-site relative redirects after login. */
const safeNext = (next: unknown) => (typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null);

function homeFor(user: { role: string; sellerProfile?: unknown }) {
  return user.role === "ADMIN" ? "/admin" : "/account";
}

export async function loginAction(input: { email: string; password: string; next?: string }) {
  const r = await runAction(async () => {
    await rateLimit("login", 10);
    const user = await auth.authenticate(db, input);
    await createSession(user.id);
    await audit(db, { actorId: user.id, action: "user.login", entityType: "User", entityId: user.id });
    return safeNext(input.next) ?? homeFor(user);
  });
  return r;
}

export async function registerAction(input: { name: string; email: string; password: string; next?: string }) {
  return runAction(async () => {
    await rateLimit("register", 5);
    const user = await auth.registerUser(db, input);
    await createSession(user.id);
    return safeNext(input.next) ?? "/account?welcome=1";
  });
}

/** One-click demo sign-in. Only available when DEMO_MODE=true, and only for seeded demo accounts. */
export async function demoLoginAction(role: "customer" | "seller" | "admin") {
  return runAction(async () => {
    if (!env.demoMode) throw new AppError("FORBIDDEN", "Demo sign-in is disabled on this deployment");
    await rateLimit("demo-login", 20);
    const email = `${role}@borrowly.demo`;
    const user = await db.user.findUnique({ where: { email }, include: { sellerProfile: true } });
    if (!user || !user.isDemo || user.status !== "ACTIVE") throw new AppError("NOT_FOUND", "Demo account not found — run the seed script");
    await createSession(user.id);
    await audit(db, { actorId: user.id, action: "user.demo_login", entityType: "User", entityId: user.id });
    return role === "admin" ? "/admin" : role === "seller" ? "/seller" : "/account";
  });
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function forgotPasswordAction(input: { email: string }) {
  return runAction(async () => {
    await rateLimit("forgot", 5);
    await auth.requestPasswordReset(db, input);
  }, "If an account exists for that email, a reset link has been sent.");
}

export async function resetPasswordAction(input: { token: string; password: string }) {
  return runAction(async () => {
    await rateLimit("reset", 10);
    await auth.resetPassword(db, input);
  }, "Password updated. Please log in.");
}

export async function resendVerificationAction() {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in");
    if (user.emailVerifiedAt) throw new AppError("CONFLICT", "Your email is already verified");
    await rateLimit("verify-email", 3, 60_000, user.id);
    await auth.sendVerificationEmail(db, user);
  }, "Verification email sent");
}

export async function updateProfileAction(input: unknown) {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in");
    const data = profileSchema.parse(input);
    await db.user.update({
      where: { id: user.id },
      data: { name: data.name, profile: { upsert: { create: { phone: data.phone || null, area: data.area || null, bio: data.bio || null }, update: { phone: data.phone || null, area: data.area || null, bio: data.bio || null } } } },
    });
  }, "Profile saved");
}

export async function changePasswordAction(input: { current: string; next: string }) {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in");
    await rateLimit("change-password", 5, 60_000, user.id);
    await auth.changePassword(db, user.id, input.current, input.next);
  }, "Password changed");
}

export async function setAreaAction(area: string | null) {
  const jar = await cookies();
  if (area && (AREA_NAMES as string[]).includes(area)) jar.set("borrowly_area", area, { path: "/", maxAge: 60 * 60 * 24 * 180, sameSite: "lax" });
  else jar.delete("borrowly_area");
}
