import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { formatDay } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { earningsByMonth, sellerOverview } from "@/modules/reports/queries";
import { getSettings } from "@/modules/platform/service";
import { EarningsChart } from "@/components/charts/bar-chart";
import { PageHeader, Stat, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const { actor } = await requireSellerPage();
  const sellerId = actor.sellerId;
  const [o, chart, bookings, orders, settings] = await Promise.all([
    sellerOverview(db, sellerId),
    earningsByMonth(db, sellerId, 12),
    db.rentalBooking.findMany({ where: { sellerId, status: "COMPLETED" }, include: { listing: { select: { title: true } } }, orderBy: { completedAt: "desc" } }),
    db.purchaseOrder.findMany({ where: { sellerId, status: "COMPLETED" }, include: { listing: { select: { title: true } } }, orderBy: { completedAt: "desc" } }),
    getSettings(db),
  ]);
  const history = [
    ...bookings.map((b) => ({ id: b.id, href: `/seller/bookings/${b.id}`, code: b.code, title: b.listing.title, kind: "Rental", date: b.completedAt!, gross: b.rentalSubtotalPaise, commission: b.commissionPaise, net: b.sellerNetPaise + b.lateFeePaise })),
    ...orders.map((x) => ({ id: x.id, href: `/seller/orders/${x.id}`, code: x.code, title: x.listing.title, kind: "Sale", date: x.completedAt!, gross: x.subtotalPaise, commission: x.commissionPaise, net: x.sellerNetPaise })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <>
      <PageHeader title="Earnings" description={`Current commission: ${settings.commissionBps / 100}% on completed transactions. Each transaction keeps the rate that applied when it was booked.`} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Gross transaction value" value={formatINR(o.gross)} />
        <Stat label="Commission" value={formatINR(o.commission)} />
        <Stat label="Net earnings" value={formatINR(o.net)} />
      </div>
      <div className="mt-6"><EarningsChart data={chart} title="Monthly earnings — last 12 months" /></div>
      <h2 className="mt-8 mb-3 text-lg font-bold">Sales history</h2>
      <TableWrap>
        <table className="table-base min-w-[680px]">
          <thead><tr><th>Completed</th><th>Transaction</th><th className="text-right">Gross</th><th className="text-right">Commission</th><th className="text-right">Net</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td className="whitespace-nowrap text-ink-soft">{formatDay(h.date)}</td>
                <td><Link href={h.href} className="font-medium hover:text-forest">{h.title}</Link><p className="text-xs text-ink-faint">{h.kind} · {h.code}</p></td>
                <td className="text-right tabular-nums">{formatINR(h.gross)}</td>
                <td className="text-right tabular-nums text-ink-soft">− {formatINR(h.commission)}</td>
                <td className="text-right font-semibold tabular-nums">{formatINR(h.net)}</td>
              </tr>
            ))}
            {!history.length && <tr><td colSpan={5} className="py-10 text-center text-ink-soft">No completed transactions yet.</td></tr>}
          </tbody>
        </table>
      </TableWrap>
      <p className="mt-3 text-xs text-ink-faint">Payouts are not processed in this demo. A production launch would settle earnings through a regulated payment partner.</p>
    </>
  );
}
