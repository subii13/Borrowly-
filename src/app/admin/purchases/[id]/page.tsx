import Link from "next/link";
import { requireAdminPage } from "@/lib/session";
import { PurchaseDetail } from "@/components/orders/transaction-detail";

export default async function AdminPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireAdminPage();
  return (
    <>
      <Link href="/admin/purchases" className="mb-4 inline-block text-sm text-ink-soft hover:text-brand">← All purchases</Link>
      <PurchaseDetail orderId={id} actor={actor} />
    </>
  );
}
