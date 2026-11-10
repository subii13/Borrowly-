import type { Metadata } from "next";
import Link from "next/link";
import type { ListingStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/money";
import { LISTING_STATUS_LABEL } from "@/lib/constants";
import { moderateListingAction } from "@/app/actions/admin";
import { AdminSearch } from "@/components/admin/search-form";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Listing moderation" };

const STATUSES = Object.keys(LISTING_STATUS_LABEL) as ListingStatus[];

export default async function AdminListings({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const st = STATUSES.includes(status as ListingStatus) ? (status as ListingStatus) : undefined;
  const listings = await db.listing.findMany({
    where: { ...(st ? { status: st } : {}), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { seller: { displayName: { contains: q, mode: "insensitive" } } }] } : {}) },
    include: { seller: { select: { displayName: true } }, category: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageHeader title="Listings" description="Moderate listings. Suspended listings are hidden and the seller is notified." />
      <AdminSearch
        placeholder="Search title or seller"
        defaultValue={q}
        extra={
          <select name="status" defaultValue={st ?? ""} className="input w-auto" aria-label="Status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{LISTING_STATUS_LABEL[s]}</option>)}
          </select>
        }
      />
      <TableWrap>
        <table className="table-base min-w-[780px]">
          <thead><tr><th>Listing</th><th>Seller</th><th>Price</th><th>Status</th><th className="text-right">Moderation</th></tr></thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td><Link href={`/listings/${l.id}`} className="font-medium hover:text-brand">{l.title}</Link><p className="text-xs text-ink-faint">{l.category.name} · {l.area}{l.isDemo && " · demo"}</p>{l.moderationNote && <p className="text-xs text-rose">{l.moderationNote}</p>}</td>
                <td className="text-ink-soft">{l.seller.displayName}</td>
                <td className="whitespace-nowrap text-sm">{l.rentalEnabled ? `${formatINR(l.dailyRatePaise)}/day` : formatINR(l.salePricePaise)}</td>
                <td><StatusBadge status={l.status} label={LISTING_STATUS_LABEL[l.status]} /></td>
                <td className="text-right">
                  {l.status === "SUSPENDED"
                    ? <ActionButton variant="secondary" action={moderateListingAction.bind(null, l.id, "reinstate")}>Reinstate</ActionButton>
                    : <ActionButton variant="ghost" action={moderateListingAction.bind(null, l.id, "suspend")} prompt={{ label: "Reason for suspension (sent to the seller)", required: true }}>Suspend</ActionButton>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
