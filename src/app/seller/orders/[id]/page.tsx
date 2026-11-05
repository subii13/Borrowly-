import type { Metadata } from "next";
import Link from "next/link";
import { requireSellerPage } from "@/lib/session";
import { PurchaseDetail } from "@/components/orders/transaction-detail";

export const metadata: Metadata = { title: "Order" };

export default async function SellerOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireSellerPage();
  return (
    <>
      <Link href="/seller/orders" className="mb-4 inline-block text-sm text-ink-soft hover:text-forest">← All orders</Link>
      <PurchaseDetail orderId={id} actor={actor} />
    </>
  );
}
