import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { categoryPerformance, earningsByMonth, platformOverview } from "@/modules/reports/queries";
import { EarningsChart } from "@/components/charts/bar-chart";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReports() {
  const [cats, months, o, topSellers] = await Promise.all([
    categoryPerformance(db),
    earningsByMonth(db, null, 12),
    platformOverview(db),
    db.sellerProfile.findMany({ orderBy: { ratingCount: "desc" }, take: 5, select: { displayName: true, ratingSum: true, ratingCount: true, _count: { select: { bookings: { where: { status: "COMPLETED" } } } } } }),
  ]);
  return (
    <>
      <PageHeader title="Reports" description="Aggregates computed directly from transactions. Demo data is included and labelled as such elsewhere." />
      <EarningsChart data={months} title="Monthly GMV and seller earnings — last 12 months" />
      <h2 className="mt-8 mb-3 text-lg font-bold">Monthly breakdown</h2>
      <TableWrap>
        <table className="table-base">
          <thead><tr><th>Month</th><th className="text-right">GMV</th><th className="text-right">Commission</th><th className="text-right">Seller earnings</th></tr></thead>
          <tbody>{months.map((m) => <tr key={m.month}><td>{m.label} {m.month.slice(0, 4)}</td><td className="text-right tabular-nums">{formatINR(m.gross)}</td><td className="text-right tabular-nums">{formatINR(m.commission)}</td><td className="text-right tabular-nums">{formatINR(m.net)}</td></tr>)}</tbody>
        </table>
      </TableWrap>
      <h2 className="mt-8 mb-3 text-lg font-bold">Category performance</h2>
      <TableWrap>
        <table className="table-base">
          <thead><tr><th>Category</th><th className="text-right">Active listings</th><th className="text-right">Completed rentals</th><th className="text-right">Completed sales</th><th className="text-right">GMV</th></tr></thead>
          <tbody>{cats.map((c) => <tr key={c.name}><td>{c.name}</td><td className="text-right">{c.listings}</td><td className="text-right">{c.bookings}</td><td className="text-right">{c.orders}</td><td className="text-right tabular-nums">{formatINR(c.gross)}</td></tr>)}</tbody>
        </table>
      </TableWrap>
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="font-semibold">Payments by state</h3>
          <ul className="mt-3 space-y-2 text-sm">{o.payments.map((p) => <li key={p.status} className="flex items-center justify-between gap-2"><StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} /><span className="tabular-nums">{p._count} · {formatINR(p._sum.amountPaise ?? 0)}</span></li>)}</ul>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">Most-reviewed sellers</h3>
          <ul className="mt-3 space-y-2 text-sm">{topSellers.map((s) => <li key={s.displayName} className="flex justify-between"><span>{s.displayName}</span><span className="text-ink-soft">{s.ratingCount ? (s.ratingSum / s.ratingCount).toFixed(1) : "—"}★ · {s._count.bookings} rentals</span></li>)}</ul>
        </div>
      </div>
    </>
  );
}
