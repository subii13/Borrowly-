import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { OrderList } from "@/components/orders/lists";
import { EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Manage purchases" };

export default async function SellerOrdersPage() {
  const { actor } = await requireSellerPage();
  const rows = await db.purchaseOrder.findMany({
    where: { sellerId: actor.sellerId },
    include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, customer: { select: { name: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return (
    <>
      <PageHeader title="Purchase orders" description="Accept orders, hand items over, and track completed sales." />
      {rows.length ? <OrderList basePath="/seller/orders" showNet rows={rows.map((o) => ({ ...o, counterparty: o.customer.name }))} /> : <EmptyState icon={ShoppingBag} title="No orders yet" body="Enable 'Available to buy' on a listing to start selling." />}
    </>
  );
}
