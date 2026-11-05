import type { Metadata } from "next";
import type { BookingStatus } from "@prisma/client";
import { CalendarX } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { BookingList, TabLinks } from "@/components/orders/lists";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My bookings" };

const TABS: Record<string, { label: string; statuses: BookingStatus[] }> = {
  active: { label: "Active", statuses: ["ACTIVE", "RETURN_PENDING"] },
  upcoming: { label: "Upcoming", statuses: ["REQUESTED", "CONFIRMED"] },
  completed: { label: "Completed", statuses: ["COMPLETED"] },
  cancelled: { label: "Cancelled & failed", statuses: ["CANCELLED", "REJECTED", "PAYMENT_FAILED", "PENDING_PAYMENT"] },
};

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { user } = await requireUserPage("/account/bookings");
  const tab = (await searchParams).tab ?? "all";
  const counts = await db.rentalBooking.groupBy({ by: ["status"], where: { customerId: user.id }, _count: true });
  const rows = await db.rentalBooking.findMany({
    where: { customerId: user.id, ...(TABS[tab] ? { status: { in: TABS[tab].statuses } } : {}) },
    include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, seller: { select: { displayName: true } } },
    orderBy: { startDate: "desc" },
  });
  const count = (s: BookingStatus[]) => counts.filter((c) => s.includes(c.status)).reduce((a, c) => a + c._count, 0);
  return (
    <>
      <PageHeader title="My bookings" description="Track rentals from request to return." />
      <TabLinks
        active={tab}
        tabs={[{ key: "all", label: "All", href: "/account/bookings", count: counts.reduce((a, c) => a + c._count, 0) }, ...Object.entries(TABS).map(([key, t]) => ({ key, label: t.label, href: `/account/bookings?tab=${key}`, count: count(t.statuses) }))]}
      />
      {rows.length ? (
        <BookingList basePath="/account/bookings" rows={rows.map((b) => ({ ...b, counterparty: b.seller.displayName }))} />
      ) : (
        <EmptyState icon={CalendarX} title="No bookings here" body="Rent something by the day — cameras, tools, speakers and more." action={<ButtonLink href="/explore?mode=rent" size="sm">Browse rentals</ButtonLink>} />
      )}
    </>
  );
}
