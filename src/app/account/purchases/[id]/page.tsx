import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { requireUserPage } from "@/lib/session";
import { PurchaseDetail } from "@/components/orders/transaction-detail";

export const metadata: Metadata = { title: "Order" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const { id } = await params;
  const { actor } = await requireUserPage(`/account/purchases/${id}`);
  const isNew = (await searchParams).new === "1";
  return (
    <>
      <Link href="/account/purchases" className="mb-4 inline-block text-sm text-ink-soft hover:text-brand">← All purchases</Link>
      {isNew && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-brand-50 p-4 text-brand" role="status">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Purchase confirmed</p>
            <p className="text-sm">Your demo payment succeeded and the item is reserved for you. The seller will accept and share pickup details.</p>
          </div>
        </div>
      )}
      <PurchaseDetail orderId={id} actor={actor} />
    </>
  );
}
