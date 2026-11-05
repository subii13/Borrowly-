import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { partyOf } from "@/lib/permissions";
import { requireUserPage } from "@/lib/session";
import { disputeAction } from "@/app/actions/orders";
import { DisputeForm } from "@/components/orders/order-forms";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Report a problem" };

export default async function NewDisputePage({ searchParams }: { searchParams: Promise<{ booking?: string; order?: string }> }) {
  const { booking, order } = await searchParams;
  const { actor } = await requireUserPage("/account/disputes");
  const txn = booking
    ? await db.rentalBooking.findUnique({ where: { id: booking }, include: { listing: { select: { title: true } } } })
    : order
      ? await db.purchaseOrder.findUnique({ where: { id: order }, include: { listing: { select: { title: true } } } })
      : null;
  if (!txn || !partyOf(actor, txn)) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Report a problem" description={`${txn.code} · ${txn.listing.title}`} />
      <div className="card p-6">
        <DisputeForm action={disputeAction.bind(null, booking ? { bookingId: booking } : { purchaseOrderId: order })} />
      </div>
      <p className="mt-4 text-xs text-ink-faint">Borrowly support reviews every dispute. Refund decisions are recorded against the original demo payment.</p>
    </div>
  );
}
