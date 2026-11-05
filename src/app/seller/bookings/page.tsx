import type { Metadata } from "next";
import type { BookingStatus } from "@prisma/client";
import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { BookingList, TabLinks } from "@/components/orders/lists";
import { EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Manage bookings" };

const TABS: Record<string, { label: string; statuses: BookingStatus[] }> = {
  requested: { label: "Requests", statuses: ["REQUESTED"] },
  confirmed: { label: "Confirmed", statuses: ["CONFIRMED"] },
  active: { label: "Active", statuses: ["ACTIVE", "RETURN_PENDING"] },
  completed: { label: "Completed", statuses: ["COMPLETED"] },
  closed: { label: "Cancelled", statuses: ["CANCELLED", "REJECTED", "PAYMENT_FAILED", "PENDING_PAYMENT"] },
};

export default async function SellerBookingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { actor } = await requireSellerPage();
  const tab = (await searchParams).tab ?? "requested";
  const def = TABS[tab] ?? TABS.requested;
  const [counts, rows] = await Promise.all([
    db.rentalBooking.groupBy({ by: ["status"], where: { sellerId: actor.sellerId }, _count: true }),
    db.rentalBooking.findMany({
      where: { sellerId: actor.sellerId, status: { in: def.statuses } },
      include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, customer: { select: { name: true } } },
      orderBy: { startDate: tab === "completed" || tab === "closed" ? "desc" : "asc" },
    }),
  ]);
  return (
    <>
      <PageHeader title="Bookings" description="Confirm requests, record handovers and returns." />
      <TabLinks active={tab in TABS ? tab : "requested"} tabs={Object.entries(TABS).map(([key, t]) => ({ key, label: t.label, href: `/seller/bookings?tab=${key}`, count: counts.filter((c) => t.statuses.includes(c.status)).reduce((a, c) => a + c._count, 0) }))} />
      {rows.length ? (
        <BookingList basePath="/seller/bookings" showNet rows={rows.map((b) => ({ ...b, counterparty: b.customer.name }))} />
      ) : (
        <EmptyState icon={Inbox} title="Nothing here" body="Bookings in this state will appear here." />
      )}
    </>
  );
}
