import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Inbox, Layers, PackageCheck, Plus, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { formatDay, todayIST } from "@/lib/dates";
import { VERIFICATION_LABEL } from "@/lib/constants";
import { earningsByMonth, sellerOverview } from "@/modules/reports/queries";
import { EarningsChart } from "@/components/charts/bar-chart";
import { BookingList } from "@/components/orders/lists";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, Stat } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Seller dashboard" };

export default async function SellerDashboard() {
  const { user, actor } = await requireSellerPage();
  const sellerId = actor.sellerId;
  const [o, chart, requests, seller] = await Promise.all([
    sellerOverview(db, sellerId),
    earningsByMonth(db, sellerId, 6),
    db.rentalBooking.findMany({
      where: { sellerId, status: "REQUESTED" },
      include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, customer: { select: { name: true } } },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    db.sellerProfile.findUniqueOrThrow({ where: { id: sellerId } }),
  ]);
  const today = todayIST();

  return (
    <>
      <PageHeader
        eyebrow="Seller dashboard"
        title={seller.displayName}
        description={<span className="inline-flex flex-wrap items-center gap-2">Verification: <Badge tone={seller.verificationStatus === "VERIFIED" ? "green" : "amber"}>{VERIFICATION_LABEL[seller.verificationStatus]}</Badge></span>}
        actions={<ButtonLink href="/seller/listings/new" size="sm"><Plus className="size-4" />New listing</ButtonLink>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total listings" value={o.totalListings} hint={`${o.activeListings} active`} icon={Layers} />
        <Stat label="Incoming requests" value={o.incoming} hint={`${o.openOrders} open purchase orders`} icon={Inbox} />
        <Stat label="Active rentals" value={o.active} hint={`${o.upcomingReturns.length} due back within 7 days`} icon={PackageCheck} />
        <Stat label="Completed" value={o.completed} hint="rentals and sales" icon={CheckCircle2} />
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Gross transaction value" value={formatINR(o.gross)} icon={Wallet} hint="Completed rentals + sales" />
        <Stat label="Platform commission" value={formatINR(o.commission)} hint="Deducted per transaction" />
        <Stat label="Your net earnings" value={formatINR(o.net)} hint="Includes late fees kept from deposits" />
      </div>

      <div className="mt-6"><EarningsChart data={chart} title="Earnings — last 6 months" /></div>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Requests to confirm</h2><Link href="/seller/bookings?tab=requested" className="text-sm font-medium text-forest hover:underline">All bookings</Link></div>
          {requests.length ? (
            <BookingList basePath="/seller/bookings" showNet rows={requests.map((b) => ({ ...b, counterparty: b.customer.name }))} />
          ) : (
            <EmptyState icon={Inbox} title="No pending requests" body="New rental requests appear here for you to confirm." />
          )}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Upcoming returns</h2><Link href="/seller/returns" className="text-sm font-medium text-forest hover:underline">View all</Link></div>
          {o.upcomingReturns.length ? (
            <ul className="card divide-y divide-line">
              {o.upcomingReturns.map((b) => {
                const overdue = b.endDate < today;
                return (
                  <li key={b.id}>
                    <Link href={`/seller/bookings/${b.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-canvas">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{b.listing.title}</span>
                        <span className="text-xs text-ink-soft">{b.customer.name} · {b.status === "RETURN_PENDING" ? "return awaiting your confirmation" : "with customer"}</span>
                      </span>
                      <span className={`flex shrink-0 items-center gap-1 text-sm ${overdue ? "font-semibold text-rose" : "text-ink-soft"}`}>
                        {overdue ? <AlertTriangle className="size-4" /> : <CalendarClock className="size-4" />}
                        {formatDay(b.endDate)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={CalendarClock} title="Nothing due back" body="Rentals due back in the next 7 days will show here." />
          )}
        </section>
      </div>
      <p className="mt-8 text-xs text-ink-faint">All figures are calculated from Borrowly records for {user.name}&apos;s seller account. Demo data is labelled as such.</p>
    </>
  );
}
