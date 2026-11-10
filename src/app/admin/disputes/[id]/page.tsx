import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { resolveDisputeAction, startDisputeReviewAction } from "@/app/actions/admin";
import { DisputeDetail } from "@/components/orders/dispute-detail";
import { ResolveDisputeForm } from "@/components/admin/resolve-form";
import { ActionButton } from "@/components/ui/action-button";

export default async function AdminDisputePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireAdminPage();
  const d = await db.dispute.findUnique({ where: { id }, select: { status: true, bookingId: true, purchaseOrderId: true } });
  const payment = d && (await db.payment.findFirst({ where: d.bookingId ? { bookingId: d.bookingId } : { purchaseOrderId: d.purchaseOrderId }, include: { refunds: true } }));
  const refundable = payment ? payment.amountPaise - payment.refunds.reduce((s, r) => s + r.amountPaise, 0) : 0;
  return (
    <>
      <Link href="/admin/disputes" className="mb-4 inline-block text-sm text-ink-soft hover:text-brand">← All disputes</Link>
      <DisputeDetail disputeId={id} actor={actor}>
        {d?.status === "OPEN" && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber/30 bg-amber-50 p-4 text-sm text-amber">
            <span>Start the investigation to let both parties know it&apos;s being reviewed.</span>
            <ActionButton action={startDisputeReviewAction.bind(null, id)}>Start review</ActionButton>
          </div>
        )}
        {d && ["OPEN", "UNDER_REVIEW"].includes(d.status) && <ResolveDisputeForm action={resolveDisputeAction.bind(null, id)} refundableLabel={`Refundable balance: ${formatINR(refundable)}`} />}
      </DisputeDetail>
    </>
  );
}
