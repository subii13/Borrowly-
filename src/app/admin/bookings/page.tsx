import type { Metadata } from "next";
import Link from "next/link";
import type { BookingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatRange, todayIST } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { BOOKING_STATUS_LABEL } from "@/lib/constants";
import { AdminSearch } from "@/components/admin/search-form";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Bookings" };

const STATUSES = Object.keys(BOOKING_STATUS_LABEL) as BookingStatus[];

export default async function AdminBookings({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const st = STATUSES.includes(status as BookingStatus) ? (status as BookingStatus) : undefined;
  const rows = await db.rentalBooking.findMany({
    where: { ...(st ? { status: st } : {}), ...(q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { listing: { title: { contains: q, mode: "insensitive" } } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {}) },
    include: { listing: { select: { title: true } }, customer: { select: { name: true } }, seller: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const today = todayIST();
  return (
    <>
      <PageHeader title="Bookings" description="Every rental booking on the platform." />
      <AdminSearch placeholder="Search code, item or customer" defaultValue={q} extra={<select name="status" defaultValue={st ?? ""} className="input w-auto" aria-label="Status"><option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{BOOKING_STATUS_LABEL[s]}</option>)}</select>} />
      <TableWrap>
        <table className="table-base min-w-[860px]">
          <thead><tr><th>Booking</th><th>Customer → Seller</th><th>Dates</th><th className="text-right">Total</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/admin/bookings/${b.id}`} className="font-medium text-forest hover:underline">{b.code}</Link><p className="text-xs text-ink-faint">{b.listing.title}</p></td>
                <td className="text-sm">{b.customer.name} → {b.seller.displayName}</td>
                <td className="whitespace-nowrap text-sm text-ink-soft">{formatRange(b.startDate, b.endDate)}</td>
                <td className="text-right tabular-nums">{formatINR(b.totalPaise)}</td>
                <td><div className="flex flex-wrap gap-1"><StatusBadge status={b.status} label={BOOKING_STATUS_LABEL[b.status]} />{["ACTIVE", "RETURN_PENDING"].includes(b.status) && b.endDate < today && <StatusBadge status="FAILED" label="Overdue" />}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
