import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "./auth";
import type { Actor } from "./permissions";

export const toActor = (user: CurrentUser): Actor => ({ id: user.id, role: user.role, sellerId: user.sellerProfile?.id ?? null });

/** For pages: redirects to login when signed out. */
export async function requireUserPage(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return { user, actor: toActor(user) };
}

export async function requireSellerPage() {
  const ctx = await requireUserPage("/seller");
  if (!ctx.user.sellerProfile) redirect("/seller/onboarding");
  return ctx as typeof ctx & { actor: Actor & { sellerId: string } };
}

export async function requireAdminPage() {
  const ctx = await requireUserPage("/admin");
  if (ctx.user.role !== "ADMIN") redirect("/account?denied=admin");
  return ctx;
}

/** For server actions / route handlers: returns null when signed out. */
export async function currentActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  return user ? toActor(user) : null;
}
