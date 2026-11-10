import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { PURCHASE_STATUS_LABEL } from "@/lib/constants";
import { AdminSearch } from "@/components/admin/search-form";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Purchases" };

export default async function AdminPurchases({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const rows = await db.purchaseOrder.findMany({
    where: q ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { listing: { title: { contains: q, mode: "insensitive" } } }, { customer: { name: { contains: q, mode: "insensitive" } } }] } : {},
    include: { listing: { select: { title: true } }, customer: { select: { name: true } }, seller: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Purchases" description="Every pre-owned purchase order." />
      <AdminSearch placeholder="Search code, item or buyer" defaultValue={q} />
      <TableWrap>
        <table className="table-base min-w-[820px]">
          <thead><tr><th>Order</th><th>Buyer → Seller</th><th>Placed</th><th className="text-right">Total</th><th className="text-right">Commission</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/purchases/${o.id}`} className="font-medium text-brand hover:underline">{o.code}</Link><p className="text-xs text-ink-faint">{o.listing.title}</p></td>
                <td className="text-sm">{o.customer.name} → {o.seller.displayName}</td>
                <td className="whitespace-nowrap text-ink-soft">{formatDay(o.createdAt)}</td>
                <td className="text-right tabular-nums">{formatINR(o.totalPaise)}</td>
                <td className="text-right tabular-nums text-ink-soft">{formatINR(o.commissionPaise)}</td>
                <td><StatusBadge status={o.status} label={PURCHASE_STATUS_LABEL[o.status]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
