import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { DISPUTE_CATEGORY_LABEL, DISPUTE_STATUS_LABEL } from "@/lib/constants";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Disputes" };

export default async function AdminDisputes() {
  const disputes = await db.dispute.findMany({
    include: { raisedBy: { select: { name: true } }, booking: { select: { code: true } }, purchaseOrder: { select: { code: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return (
    <>
      <PageHeader title="Disputes" description="Investigate, decide and record refunds. Oldest open disputes first." />
      <TableWrap>
        <table className="table-base min-w-[760px]">
          <thead><tr><th>Dispute</th><th>Category</th><th>Raised by</th><th>Opened</th><th>Status</th></tr></thead>
          <tbody>
            {disputes.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/admin/disputes/${d.id}`} className="font-medium text-brand hover:underline">{d.code}</Link><p className="text-xs text-ink-faint">on {d.booking?.code ?? d.purchaseOrder?.code}</p></td>
                <td>{DISPUTE_CATEGORY_LABEL[d.category]}</td>
                <td>{d.raisedBy.name}</td>
                <td className="whitespace-nowrap text-ink-soft">{formatDay(d.createdAt)}</td>
                <td><StatusBadge status={d.status} label={DISPUTE_STATUS_LABEL[d.status]} /></td>
              </tr>
            ))}
            {!disputes.length && <tr><td colSpan={5} className="py-10 text-center text-ink-soft">No disputes.</td></tr>}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
