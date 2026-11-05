import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { VERIFICATION_LABEL } from "@/lib/constants";
import { reviewSellerAction } from "@/app/actions/admin";
import { AdminSearch } from "@/components/admin/search-form";
import { ActionButton } from "@/components/ui/action-button";
import { PageHeader, Rating, StatusBadge, TableWrap } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Sellers" };

export default async function AdminSellers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const sellers = await db.sellerProfile.findMany({
    where: q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { user: { email: { contains: q, mode: "insensitive" } } }] } : {},
    include: { user: { select: { email: true } }, _count: { select: { listings: true, bookings: true, purchases: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader title="Sellers" description="All seller profiles. Review pending sellers from Seller verification." />
      <AdminSearch placeholder="Search seller or email" defaultValue={q} />
      <TableWrap>
        <table className="table-base min-w-[820px]">
          <thead><tr><th>Seller</th><th>Area</th><th>Listings</th><th>Rating</th><th>Status</th><th className="text-right">Action</th></tr></thead>
          <tbody>
            {sellers.map((s) => (
              <tr key={s.id}>
                <td><Link href={`/sellers/${s.id}`} className="font-medium hover:text-forest">{s.displayName}</Link><p className="text-xs text-ink-faint">{s.user.email} · {s.sellerType.toLowerCase()}</p></td>
                <td className="text-ink-soft">{s.area}</td>
                <td className="text-sm text-ink-soft">{s._count.listings} listings · {s._count.bookings + s._count.purchases} txns</td>
                <td><Rating sum={s.ratingSum} count={s.ratingCount} /></td>
                <td><StatusBadge status={s.verificationStatus} label={VERIFICATION_LABEL[s.verificationStatus]} /></td>
                <td className="text-right">
                  {s.verificationStatus === "SUSPENDED" ? (
                    <ActionButton variant="secondary" action={reviewSellerAction.bind(null, s.id, "REINSTATE")}>Reinstate</ActionButton>
                  ) : (
                    <ActionButton variant="ghost" action={reviewSellerAction.bind(null, s.id, "SUSPENDED")} prompt={{ label: "Reason for suspension (sent to the seller). Their active listings will be deactivated.", required: true }}>Suspend</ActionButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableWrap>
    </>
  );
}
