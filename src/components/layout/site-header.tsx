import Link from "next/link";
import { cookies } from "next/headers";
import { Package } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { buttonClass } from "@/components/ui/button";
import { Logo } from "./logo";
import { CategoriesMenu, LocationSelector, MobileNav, UserMenu } from "./header-client";

export async function SiteHeader() {
  const [user, categories, jar] = await Promise.all([
    getCurrentUser(),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    cookies(),
  ]);
  const area = jar.get("borrowly_area")?.value ?? null;
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;
  const menuUser = user && { name: user.name, email: user.email, isAdmin: user.role === "ADMIN", isSeller: !!user.sellerProfile, unread };

  return (
    <>
      {env.demoMode && (
        <div className="bg-brand-dark text-center text-xs text-white/90">
          <p className="container-page py-1.5">
            Demonstration marketplace: listings and people are sample data and payments are simulated.{" "}
            <Link href="/demo" className="font-semibold underline underline-offset-2">Explore the demo</Link>
          </p>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur supports-[backdrop-filter]:bg-canvas/80">
        <div className="container-page flex h-16 items-center gap-3">
          <MobileNav categories={categories} user={menuUser} />
          <Logo />
          <nav className="ml-6 hidden items-center gap-1 text-[15px] lg:flex" aria-label="Main">
            <Link href="/explore" className="rounded-lg px-3 py-2 text-ink-soft hover:bg-ink/5 hover:text-ink">Explore</Link>
            <CategoriesMenu categories={categories} />
            <Link href="/sell" className="rounded-lg px-3 py-2 text-ink-soft hover:bg-ink/5 hover:text-ink">For Sellers</Link>
            <Link href="/about" className="rounded-lg px-3 py-2 text-ink-soft hover:bg-ink/5 hover:text-ink">About</Link>
          </nav>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <LocationSelector current={area} />
            {user ? (
              <>
                <Link href="/account/bookings" className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink sm:inline-flex">
                  <Package className="size-4" aria-hidden /> Orders
                </Link>
                <UserMenu user={menuUser!} />
              </>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm", "hidden sm:inline-flex")}>Log in</Link>
                <Link href="/register" className={buttonClass("primary", "sm")}>Sign up</Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
}
