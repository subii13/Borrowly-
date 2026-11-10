"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Bell, ChevronDown, LayoutDashboard, LogOut, MapPin, Menu, ShieldCheck, Store, User, X } from "lucide-react";
import { AREAS } from "@/lib/constants";
import { logoutAction, setAreaAction } from "@/app/actions/auth";

type Cat = { slug: string; name: string };
type MenuUser = { name: string; email: string; isAdmin: boolean; isSeller: boolean; unread: number } | null;

function useClickAway(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && close();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

export function CategoriesMenu({ categories }: { categories: Cat[] }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway(open, () => setOpen(false));
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-ink-soft hover:bg-ink/5 hover:text-ink">
        Categories <ChevronDown className={clsx("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="card absolute left-0 top-full mt-2 grid w-[460px] grid-cols-2 gap-1 p-2 shadow-[var(--shadow-lift)]">
          {categories.map((c) => (
            <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-lg px-3 py-2 text-sm text-ink hover:bg-brand-50 hover:text-brand">
              {c.name}
            </Link>
          ))}
          <Link href="/explore" className="col-span-2 mt-1 rounded-lg border-t border-line px-3 pt-3 pb-2 text-sm font-medium text-brand">Browse everything →</Link>
        </div>
      )}
    </div>
  );
}

export function LocationSelector({ current }: { current: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway(open, () => setOpen(false));
  const router = useRouter();
  const choose = async (area: string | null) => {
    setOpen(false);
    await setAreaAction(area);
    router.refresh();
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Choose your area" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">
        <MapPin className="size-4 text-brand" aria-hidden />
        <span className="hidden max-w-[120px] truncate md:inline">{current ?? "All Coimbatore"}</span>
      </button>
      {open && (
        <div className="card absolute right-0 top-full mt-2 w-56 p-1.5 shadow-[var(--shadow-lift)]">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">Coimbatore</p>
          <button onClick={() => choose(null)} className={clsx("block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50", !current && "font-semibold text-brand")}>All areas</button>
          {AREAS.map((a) => (
            <button key={a.name} onClick={() => choose(a.name)} className={clsx("block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-brand-50", current === a.name && "font-semibold text-brand")}>
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function UserMenu({ user }: { user: NonNullable<MenuUser> }) {
  const [open, setOpen] = useState(false);
  const ref = useClickAway(open, () => setOpen(false));
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const initials = user.name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account menu" className="relative flex items-center gap-2 rounded-full p-0.5 hover:bg-ink/5">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{initials}</span>
        {user.unread > 0 && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-canvas bg-rose" aria-label={`${user.unread} unread notifications`} />}
      </button>
      {open && (
        <div className="card absolute right-0 top-full mt-2 w-64 p-1.5 shadow-[var(--shadow-lift)]">
          <div className="border-b border-line px-3 pt-2 pb-3">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink-soft">{user.email}</p>
          </div>
          <div className="py-1">
            <MenuLink href="/account" icon={User}>My account</MenuLink>
            <MenuLink href="/account/notifications" icon={Bell}>Notifications{user.unread > 0 && <span className="ml-auto rounded-full bg-rose px-1.5 text-xs text-white">{user.unread}</span>}</MenuLink>
            <MenuLink href={user.isSeller ? "/seller" : "/seller/onboarding"} icon={Store}>{user.isSeller ? "Seller dashboard" : "Start selling"}</MenuLink>
            {user.isAdmin && <MenuLink href="/admin" icon={ShieldCheck}>Admin console</MenuLink>}
          </div>
          <form action={logoutAction} className="border-t border-line pt-1">
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">
              <LogOut className="size-4" aria-hidden /> Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon: Icon, children }: { href: string; icon: typeof User; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink hover:bg-brand-50 hover:text-brand">
      <Icon className="size-4" aria-hidden /> {children}
    </Link>
  );
}

export function MobileNav({ categories, user }: { categories: Cat[]; user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <>
      <button type="button" className="-ml-2 grid size-10 place-items-center rounded-lg text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="size-5" aria-hidden />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-canvas p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Menu</span>
              <button className="grid size-10 place-items-center rounded-lg" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
            </div>
            <nav className="flex flex-col gap-1 text-[15px]">
              <Link href="/explore" className="rounded-lg px-3 py-3 hover:bg-ink/5">Explore</Link>
              <Link href="/sell" className="rounded-lg px-3 py-3 hover:bg-ink/5">For Sellers</Link>
              <Link href="/about" className="rounded-lg px-3 py-3 hover:bg-ink/5">About</Link>
              <Link href="/how-it-works" className="rounded-lg px-3 py-3 hover:bg-ink/5">How it works</Link>
              {user ? (
                <>
                  <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-3 hover:bg-ink/5"><LayoutDashboard className="size-4" /> My account</Link>
                  <Link href="/account/bookings" className="rounded-lg px-3 py-3 hover:bg-ink/5">Orders & bookings</Link>
                  <Link href={user.isSeller ? "/seller" : "/seller/onboarding"} className="rounded-lg px-3 py-3 hover:bg-ink/5">{user.isSeller ? "Seller dashboard" : "Start selling"}</Link>
                  {user.isAdmin && <Link href="/admin" className="rounded-lg px-3 py-3 hover:bg-ink/5">Admin console</Link>}
                </>
              ) : (
                <Link href="/login" className="rounded-lg px-3 py-3 hover:bg-ink/5">Log in</Link>
              )}
            </nav>
            <p className="mt-6 mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">Categories</p>
            <div className="flex flex-col gap-0.5">
              {categories.map((c) => (
                <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-lg px-3 py-2.5 text-sm text-ink-soft hover:bg-ink/5 hover:text-ink">{c.name}</Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
