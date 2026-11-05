import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { BookingList } from "@/components/orders/lists";
import { EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Upcoming returns" };

export default async function ReturnsPage() {
  const { actor } = await requireSellerPage();
  const rows = await db.rentalBooking.findMany({
    where: { sellerId: actor.sellerId, status: { in: ["ACTIVE", "RETURN_PENDING"] } },
    include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, customer: { select: { name: true } } },
    orderBy: { endDate: "asc" },
  });
  return (
    <>
      <PageHeader title="Upcoming returns" description="Items currently out with customers, soonest return first. Overdue returns are flagged on each booking." />
      {rows.length ? <BookingList basePath="/seller/bookings" showNet rows={rows.map((b) => ({ ...b, counterparty: b.customer.name }))} /> : <EmptyState icon={PackageCheck} title="Nothing is out right now" body="Active rentals will be listed here until they're returned." />}
    </>
  );
}
