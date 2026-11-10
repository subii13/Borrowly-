"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

export type NavItem = { href: string; label: string; badge?: number };

export function DashboardNav({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href.split("/").length <= 2 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <aside className="lg:w-56 lg:shrink-0">
      <p className="mb-3 hidden px-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint lg:block">{title}</p>
      <nav aria-label={title} className="-mx-4 flex gap-1 overflow-x-auto px-4 scrollbar-none lg:mx-0 lg:flex-col lg:px-0 lg:sticky lg:top-24">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm whitespace-nowrap",
              isActive(item.href) ? "bg-brand text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            {item.label}
            {!!item.badge && <span className={clsx("rounded-full px-1.5 text-xs", isActive(item.href) ? "bg-white/20" : "bg-amber-50 text-amber")}>{item.badge}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
