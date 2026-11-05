import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { processRefundAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Refunds" };

export default async function AdminRefunds() {
  const refunds = await db.refund.findMany({
    include: { payment: { include: { payer: { select: { name: true } }, booking: { select: { code: true } }, purchaseOrder: { select: { code: true } } } }, dispute: { select: { code: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 300,
  });
  return (
    <>
      <PageHeader title="Refunds" description="Refund records against demo payments. Processing a refund simulates the provider call — no real money moves." />
      <TableWrap>
        <table className="table-base min-w-[860px]">
          <thead><tr><th>Created</th><th>Customer</th><th>Transaction</th><th>Type</th><th className="text-right">Amount</th><th>Status</th><th /></tr></thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(r.createdAt)}</td>
                <td>{r.payment.payer.name}</td>
                <td className="text-sm">{r.payment.booking?.code ?? r.payment.purchaseOrder?.code}{r.dispute && <span className="block text-xs text-ink-faint">{r.dispute.code}</span>}</td>
                <td className="text-sm">{r.type.replace("_", " ").toLowerCase()}<span className="block text-xs text-ink-faint">{r.reason}</span></td>
                <td className="text-right tabular-nums">{formatINR(r.amountPaise)}</td>
                <td><StatusBadge status={r.status} /></td>
                <td className="text-right">{r.status === "PENDING" && <ActionButton action={processRefundAction.bind(null, r.id)} confirm={`Mark ${formatINR(r.amountPaise)} refund as processed?`}>Process</ActionButton>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
