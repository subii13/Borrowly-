import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Heart, MailWarning, Package, ShoppingBag, Store } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { BookingList } from "@/components/orders/lists";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, Stat } from "@/components/ui/primitives";
import { resendVerificationAction } from "@/app/actions/auth";

export const metadata: Metadata = { title: "My account" };

const bookingInclude = { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true } } } }, seller: { select: { displayName: true } } };

export default async function AccountOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const { user } = await requireUserPage("/account");
  const { denied } = await searchParams;
  const [current, counts, openOrders, favs, notes] = await Promise.all([
    db.rentalBooking.findMany({ where: { customerId: user.id, status: { in: ["REQUESTED", "CONFIRMED", "ACTIVE", "RETURN_PENDING"] } }, include: bookingInclude, orderBy: { startDate: "asc" } }),
    db.rentalBooking.groupBy({ by: ["status"], where: { customerId: user.id }, _count: true }),
    db.purchaseOrder.count({ where: { customerId: user.id, status: { in: ["PLACED", "ACCEPTED", "HANDED_OVER"] } } }),
    db.favourite.count({ where: { userId: user.id } }),
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 4 }),
  ]);
  const c = (s: string[]) => counts.filter((x) => s.includes(x.status)).reduce((a, x) => a + x._count, 0);

  return (
    <>
      <PageHeader eyebrow="Customer dashboard" title={`Hi, ${user.name.split(" ")[0]}`} description="Your rentals, purchases and saved items in one place." actions={<ButtonLink href="/explore" size="sm">Find something to rent</ButtonLink>} />
      {denied && <p className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose">That area is for administrators only.</p>}
      {!user.emailVerifiedAt && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-amber/30 bg-amber-50 p-4 text-sm text-amber">
          <MailWarning className="size-5" />
          <p className="mr-auto">Please verify your email address. In this demo the link appears in the <Link href="/dev/outbox" className="underline">development outbox</Link>.</p>
          <ActionButton variant="secondary" action={resendVerificationAction}>Resend email</ActionButton>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active rentals" value={c(["ACTIVE", "RETURN_PENDING"])} icon={Package} />
        <Stat label="Upcoming bookings" value={c(["REQUESTED", "CONFIRMED"])} icon={CalendarClock} />
        <Stat label="Completed rentals" value={c(["COMPLETED"])} icon={Store} />
        <Stat label="Open purchases" value={openOrders} hint={`${favs} saved favourites`} icon={ShoppingBag} />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Current & upcoming rentals</h2><Link href="/account/bookings" className="text-sm font-medium text-brand hover:underline">All bookings</Link></div>
          {current.length ? (
            <BookingList basePath="/account/bookings" rows={current.map((b) => ({ ...b, counterparty: b.seller.displayName }))} />
          ) : (
            <EmptyState icon={CalendarClock} title="No upcoming rentals" body="When you book something, it'll appear here with pickup and return dates." action={<ButtonLink href="/explore" size="sm">Explore listings</ButtonLink>} />
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Latest updates</h2><Link href="/account/notifications" className="text-sm font-medium text-brand hover:underline">All</Link></div>
          <ul className="card divide-y divide-line">
            {notes.map((n) => (
              <li key={n.id} className="p-4">
                <Link href={n.link ?? "/account/notifications"} className="block">
                  <p className="flex items-center gap-2 text-sm font-semibold">{!n.readAt && <span className="size-2 rounded-full bg-brand" />}{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{n.body}</p>
                  <p className="mt-1 text-xs text-ink-faint">{formatDateTime(n.createdAt)}</p>
                </Link>
              </li>
            ))}
            {!notes.length && <li className="p-4 text-sm text-ink-soft">Nothing yet.</li>}
          </ul>
          <Link href="/account/favourites" className="card mt-4 flex items-center gap-3 p-4 text-sm hover:shadow-[var(--shadow-lift)]"><Heart className="size-4 text-rose" /> {favs} saved {favs === 1 ? "item" : "items"}</Link>
        </section>
      </div>
    </>
  );
}
