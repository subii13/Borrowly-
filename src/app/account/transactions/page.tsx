import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const { user } = await requireUserPage("/account/transactions");
  const payments = await db.payment.findMany({
    where: { payerId: user.id },
    include: { booking: { select: { id: true, code: true, listing: { select: { title: true } } } }, purchaseOrder: { select: { id: true, code: true, listing: { select: { title: true } } } }, refunds: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Transaction history" description="Every demo payment and refund on your account. No real money is charged." />
      {payments.length ? (
        <TableWrap>
          <table className="table-base">
            <thead><tr><th>Date</th><th>For</th><th className="text-right">Amount</th><th className="text-right">Refunded</th><th>Status</th></tr></thead>
            <tbody>
              {payments.map((p) => {
                const t = p.booking ?? p.purchaseOrder;
                const href = p.booking ? `/account/bookings/${p.booking.id}` : `/account/purchases/${p.purchaseOrder?.id}`;
                const refunded = p.refunds.filter((r) => r.status === "PROCESSED").reduce((s, r) => s + r.amountPaise, 0);
                return (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap text-ink-soft">{formatDateTime(p.createdAt)}</td>
                    <td><Link href={href} className="font-medium hover:text-brand">{t?.listing.title}</Link><p className="text-xs text-ink-faint">{t?.code} · {p.booking ? "Rental" : "Purchase"}</p></td>
                    <td className="text-right tabular-nums">{formatINR(p.amountPaise)}</td>
                    <td className="text-right tabular-nums text-ink-soft">{refunded ? formatINR(refunded) : "—"}</td>
                    <td><StatusBadge status={p.status} label={PAYMENT_STATUS_LABEL[p.status]} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState icon={Receipt} title="No transactions yet" body="Payments for rentals and purchases will appear here." />
      )}
    </>
  );
}
