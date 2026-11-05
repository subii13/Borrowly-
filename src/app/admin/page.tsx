import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Gavel, Layers, ReceiptText, Users } from "lucide-react";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { formatDateTime } from "@/lib/dates";
import { BOOKING_STATUS_LABEL, PURCHASE_STATUS_LABEL } from "@/lib/constants";
import { earningsByMonth, platformOverview } from "@/modules/reports/queries";
import { EarningsChart } from "@/components/charts/bar-chart";
import { PageHeader, Stat } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  const [o, chart, logs] = await Promise.all([platformOverview(db), earningsByMonth(db, null, 6), db.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 8 })]);
  return (
    <>
      <PageHeader eyebrow="Admin console" title="Platform overview" description="Live figures from the Borrowly database." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Users" value={o.users} hint={`${o.sellers} with seller profiles`} icon={Users} />
        <Stat label="Pending verification" value={<Link href="/admin/verification" className="hover:text-forest">{o.pendingSellers}</Link>} icon={BadgeCheck} />
        <Stat label="Active listings" value={o.activeListings} icon={Layers} />
        <Stat label="Open disputes" value={<Link href="/admin/disputes" className="hover:text-forest">{o.openDisputes}</Link>} hint={`${o.pendingRefunds.count} refunds pending (${formatINR(o.pendingRefunds.amount)})`} icon={Gavel} />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Stat label="Gross transaction value (completed)" value={formatINR(o.gmv)} icon={ReceiptText} />
        <Stat label="Platform commission earned" value={formatINR(o.commission)} hint="Demo transactions — no real money" />
      </div>
      <div className="mt-6"><EarningsChart data={chart} title="Platform GMV vs seller earnings — last 6 months" /></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h3 className="font-semibold">Bookings by status</h3>
          <ul className="mt-3 space-y-1.5 text-sm">{o.bookings.map((b) => <li key={b.status} className="flex justify-between"><span className="text-ink-soft">{BOOKING_STATUS_LABEL[b.status]}</span><span className="font-medium tabular-nums">{b._count}</span></li>)}</ul>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold">Purchases by status</h3>
          <ul className="mt-3 space-y-1.5 text-sm">{o.orders.map((b) => <li key={b.status} className="flex justify-between"><span className="text-ink-soft">{PURCHASE_STATUS_LABEL[b.status]}</span><span className="font-medium tabular-nums">{b._count}</span></li>)}</ul>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between"><h3 className="font-semibold">Recent activity</h3><Link href="/admin/audit-logs" className="text-xs text-forest hover:underline">All</Link></div>
          <ul className="mt-3 space-y-2 text-sm">{logs.map((l) => <li key={l.id}><span className="font-medium">{l.action}</span><span className="block text-xs text-ink-faint">{l.actor?.name ?? "System"} · {formatDateTime(l.createdAt)}</span></li>)}</ul>
        </div>
      </div>
    </>
  );
}
