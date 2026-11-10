import type { Metadata } from "next";
import Link from "next/link";
import { Layers, Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { formatINR } from "@/lib/money";
import { LISTING_STATUS_LABEL } from "@/lib/constants";
import { setListingStatusAction } from "@/app/actions/seller";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";
import { SafeImage } from "@/components/ui/safe-image";

export const metadata: Metadata = { title: "My listings" };

export default async function SellerListingsPage() {
  const { actor } = await requireSellerPage();
  const listings = await db.listing.findMany({
    where: { sellerId: actor.sellerId },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, category: { select: { name: true } }, _count: { select: { bookings: true, purchases: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <>
      <PageHeader title="My listings" description="Manage what you rent and sell, prices and stock." actions={<ButtonLink href="/seller/listings/new" size="sm"><Plus className="size-4" />New listing</ButtonLink>} />
      {listings.length ? (
        <TableWrap>
          <table className="table-base min-w-[760px]">
            <thead><tr><th>Item</th><th>Price</th><th>Stock</th><th>Activity</th><th>Status</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="relative aspect-[4/3] w-16 shrink-0 overflow-hidden rounded-md"><SafeImage src={l.images[0]?.url ?? ""} alt="" fill sizes="64px" className="object-cover" /></div>
                      <div className="min-w-0">
                        <Link href={`/listings/${l.id}`} className="line-clamp-1 font-medium hover:text-brand">{l.title}</Link>
                        <p className="text-xs text-ink-faint">{l.category.name} · {l.area}</p>
                        {l.moderationNote && <p className="text-xs text-rose">Moderation: {l.moderationNote}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-sm">
                    {l.rentalEnabled && <p>{formatINR(l.dailyRatePaise)}/day</p>}
                    {l.purchaseEnabled && <p className="text-ink-soft">Sell {formatINR(l.salePricePaise)}</p>}
                  </td>
                  <td className="tabular-nums">{l.stockQuantity}</td>
                  <td className="text-sm text-ink-soft">{l._count.bookings} bookings · {l._count.purchases} sales</td>
                  <td><StatusBadge status={l.status} label={LISTING_STATUS_LABEL[l.status]} /></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {l.status !== "SUSPENDED" && <ButtonLink href={`/seller/listings/${l.id}/edit`} variant="secondary" size="sm">Edit</ButtonLink>}
                      {(l.status === "DRAFT" || l.status === "INACTIVE") && <ActionButton variant="primary" action={setListingStatusAction.bind(null, l.id, "ACTIVE")}>Publish</ActionButton>}
                      {l.status === "ACTIVE" && <ActionButton variant="ghost" action={setListingStatusAction.bind(null, l.id, "INACTIVE")} confirm="Hide this listing from the marketplace? Existing bookings are not affected.">Deactivate</ActionButton>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      ) : (
        <EmptyState icon={Layers} title="No listings yet" body="List your first item in a couple of minutes — photos, price and location." action={<ButtonLink href="/seller/listings/new" size="sm">Create a listing</ButtonLink>} />
      )}
    </>
  );
}
