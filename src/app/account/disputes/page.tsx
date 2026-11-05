import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { formatDay } from "@/lib/dates";
import { DISPUTE_CATEGORY_LABEL, DISPUTE_STATUS_LABEL } from "@/lib/constants";
import { EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Disputes" };

export default async function DisputesPage() {
  const { user, actor } = await requireUserPage("/account/disputes");
  // Disputes I raised, plus disputes raised against my sales/rentals as a seller.
  const disputes = await db.dispute.findMany({
    where: {
      OR: [
        { raisedById: user.id },
        ...(actor.sellerId ? [{ booking: { sellerId: actor.sellerId } }, { purchaseOrder: { sellerId: actor.sellerId } }] : []),
        { booking: { customerId: user.id } },
        { purchaseOrder: { customerId: user.id } },
      ],
    },
    include: { booking: { select: { code: true } }, purchaseOrder: { select: { code: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Disputes" description="Problems with a rental or purchase. Raise one from the booking or order page." />
      {disputes.length ? (
        <TableWrap>
          <table className="table-base">
            <thead><tr><th>Reference</th><th>Transaction</th><th>Category</th><th>Opened</th><th>Status</th></tr></thead>
            <tbody>
              {disputes.map((d) => (
                <tr key={d.id}>
                  <td><Link href={`/account/disputes/${d.id}`} className="font-medium text-forest hover:underline">{d.code}</Link>{d.raisedById !== user.id && <span className="ml-2 text-xs text-ink-faint">raised by other party</span>}</td>
                  <td>{d.booking?.code ?? d.purchaseOrder?.code}</td>
                  <td>{DISPUTE_CATEGORY_LABEL[d.category]}</td>
                  <td className="whitespace-nowrap">{formatDay(d.createdAt)}</td>
                  <td><StatusBadge status={d.status} label={DISPUTE_STATUS_LABEL[d.status]} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState icon={ShieldCheck} title="No disputes" body="If something goes wrong with a rental or purchase, open it from the booking page and choose “Report a problem”." />
      )}
    </>
  );
}
