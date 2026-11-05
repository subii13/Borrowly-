import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { OrderList } from "@/components/orders/lists";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "My purchases" };

export default async function PurchasesPage() {
  const { user } = await requireUserPage("/account/purchases");
  const rows = await db.purchaseOrder.findMany({
    where: { customerId: user.id },
    include: { listing: { select: { title: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } }, seller: { select: { displayName: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="My purchases" description="Pre-owned items you've bought." />
      {rows.length ? (
        <OrderList basePath="/account/purchases" rows={rows.map((o) => ({ ...o, counterparty: o.seller.displayName }))} />
      ) : (
        <EmptyState icon={ShoppingBag} title="No purchases yet" body="Buy pre-owned items from verified sellers nearby." action={<ButtonLink href="/explore?mode=buy" size="sm">Shop pre-owned</ButtonLink>} />
      )}
    </>
  );
}
