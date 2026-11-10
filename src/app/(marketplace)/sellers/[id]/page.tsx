import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, MapPin, Store } from "lucide-react";
import { db } from "@/lib/db";
import { formatDay } from "@/lib/dates";
import { VERIFICATION_LABEL } from "@/lib/constants";
import { cardInclude } from "@/modules/listings/search";
import { ListingGrid } from "@/components/marketplace/listing-card";
import { Avatar, Badge, EmptyState, Rating, Stars } from "@/components/ui/primitives";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await db.sellerProfile.findUnique({ where: { id: (await params).id }, select: { displayName: true } });
  return { title: s?.displayName ?? "Seller" };
}

export default async function SellerProfilePage({ params }: Props) {
  const { id } = await params;
  // Public fields only — pickup address and phone are never selected here.
  const seller = await db.sellerProfile.findUnique({
    where: { id },
    select: { id: true, displayName: true, sellerType: true, bio: true, area: true, verificationStatus: true, ratingSum: true, ratingCount: true, createdAt: true },
  });
  if (!seller) notFound();
  const [listings, reviews, completed] = await Promise.all([
    db.listing.findMany({ where: { sellerId: id, status: { in: ["ACTIVE", "SOLD_OUT"] } }, include: cardInclude, orderBy: { createdAt: "desc" } }),
    db.review.findMany({ where: { sellerId: id }, include: { author: { select: { name: true } }, listing: { select: { title: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    Promise.all([db.rentalBooking.count({ where: { sellerId: id, status: "COMPLETED" } }), db.purchaseOrder.count({ where: { sellerId: id, status: "COMPLETED" } })]),
  ]);
  const verified = seller.verificationStatus === "VERIFIED";

  return (
    <div className="container-page py-10">
      <section className="card flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <Avatar name={seller.displayName} className="size-16 text-xl" />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">{seller.displayName}{verified && <BadgeCheck className="size-5 text-brand" aria-label="Verified seller" />}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-soft">
              <span className="inline-flex items-center gap-1"><Store className="size-4" />{seller.sellerType === "BUSINESS" ? "Small business" : "Individual seller"}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{seller.area}, Coimbatore</span>
              <span>Joined {formatDay(seller.createdAt)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-8 text-sm">
          <div><p className="text-ink-faint">Rating</p><div className="mt-1"><Rating sum={seller.ratingSum} count={seller.ratingCount} size="md" /></div></div>
          <div><p className="text-ink-faint">Completed</p><p className="mt-1 font-semibold">{completed[0] + completed[1]} transactions</p></div>
          <div><p className="text-ink-faint">Status</p><div className="mt-1"><Badge tone={verified ? "green" : "neutral"}>{VERIFICATION_LABEL[seller.verificationStatus]}</Badge></div></div>
        </div>
      </section>
      {seller.bio && <p className="mt-6 max-w-3xl text-ink-soft">{seller.bio}</p>}
      {verified && <p className="mt-2 text-xs text-ink-faint">Verified means Borrowly confirmed this seller&apos;s email and phone and reviewed their profile. It is not a government identity check.</p>}

      <h2 className="mt-12 mb-6 text-2xl font-bold">Listings ({listings.length})</h2>
      {listings.length ? <ListingGrid listings={listings} /> : <EmptyState icon={Store} title="No active listings" body="This seller has nothing listed right now." />}

      <h2 className="mt-12 mb-4 text-2xl font-bold">Recent reviews</h2>
      {reviews.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-ink-faint">{formatDay(r.createdAt)}</span></div>
              <p className="mt-2 text-sm text-ink-soft">{r.comment}</p>
              <p className="mt-3 text-xs text-ink-faint">{r.author.name} · {r.listing.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">No reviews yet.</p>
      )}
    </div>
  );
}
