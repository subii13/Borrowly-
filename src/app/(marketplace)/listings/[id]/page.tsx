import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, MapPin, Package, ShieldCheck, Tag } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONDITION_LABEL, VERIFICATION_LABEL } from "@/lib/constants";
import { formatDay } from "@/lib/dates";
import { cardInclude, } from "@/modules/listings/search";
import { detailInclude } from "@/modules/listings/service";
import { getSettings } from "@/modules/platform/service";
import { Gallery } from "@/components/product/gallery";
import { BookingPanel } from "@/components/product/booking-panel";
import { FavouriteButton } from "@/components/product/favourite-button";
import { ListingGrid } from "@/components/marketplace/listing-card";
import { Avatar, Badge, Rating, Stars } from "@/components/ui/primitives";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await db.listing.findUnique({ where: { id: (await params).id }, select: { title: true, description: true } });
  return l ? { title: l.title, description: l.description.slice(0, 150) } : { title: "Listing" };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const [listing, user, settings] = await Promise.all([db.listing.findUnique({ where: { id }, include: detailInclude }), getCurrentUser(), getSettings(db)]);
  const isOwner = !!user?.sellerProfile && user.sellerProfile.id === listing?.sellerId;
  // Drafts, inactive and suspended listings are visible only to their seller and admins.
  if (!listing || (!["ACTIVE", "SOLD_OUT"].includes(listing.status) && !isOwner && user?.role !== "ADMIN")) notFound();

  const [reviews, related, fav] = await Promise.all([
    db.review.findMany({ where: { listingId: id }, include: { author: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 6 }),
    db.listing.findMany({ where: { categoryId: listing.categoryId, status: "ACTIVE", id: { not: id } }, include: cardInclude, take: 4, orderBy: { ratingCount: "desc" } }),
    user ? db.favourite.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } } }) : null,
  ]);
  const verified = listing.seller.verificationStatus === "VERIFIED";

  return (
    <div className="container-page py-8">
      <nav className="mb-5 text-sm text-ink-soft" aria-label="Breadcrumb">
        <Link href="/explore" className="hover:text-forest">Explore</Link> <span className="text-ink-faint">/</span>{" "}
        <Link href={`/categories/${listing.category.slug}`} className="hover:text-forest">{listing.category.name}</Link>
      </nav>

      {listing.status !== "ACTIVE" && (
        <div className="mb-5 rounded-lg border border-amber/30 bg-amber-50 px-4 py-3 text-sm text-amber">
          This listing is <strong>{listing.status.replace("_", " ").toLowerCase()}</strong>{listing.moderationNote ? ` — ${listing.moderationNote}` : ""}. {isOwner ? "Only you can see it." : ""}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="min-w-0">
          <Gallery images={listing.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt }))} title={listing.title} />

          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2">
              {listing.rentalEnabled && <Badge tone="green">For rent</Badge>}
              {listing.purchaseEnabled && <Badge tone="sky">For sale</Badge>}
              <Badge>{CONDITION_LABEL[listing.condition]}</Badge>
              {listing.isDemo && <Badge tone="amber">Demonstration listing</Badge>}
            </div>
            <h1 className="mt-3 text-3xl font-bold leading-tight">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
              <Rating sum={listing.ratingSum} count={listing.ratingCount} size="md" />
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{listing.area}, {listing.city} {listing.pincode}</span>
              <FavouriteButton listingId={listing.id} initial={!!fav} signedIn={!!user} />
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                [Tag, "Brand", listing.brand ?? "—"],
                [Package, "Model", listing.model ?? "—"],
                [ShieldCheck, "Condition", CONDITION_LABEL[listing.condition]],
                [Clock, "Listed", listing.publishedAt ? formatDay(listing.publishedAt) : "Draft"],
              ].map(([Icon, k, v]) => {
                const I = Icon as typeof Tag;
                return (
                  <div key={k as string} className="rounded-xl border border-line bg-white p-3.5">
                    <dt className="flex items-center gap-1.5 text-xs text-ink-faint"><I className="size-3.5" />{k as string}</dt>
                    <dd className="mt-1 truncate text-sm font-semibold">{v as string}</dd>
                  </div>
                );
              })}
            </dl>

            <h2 className="mt-10 text-lg font-bold">About this item</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">{listing.description}</p>
          </div>

          <section className="mt-10 rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Avatar name={listing.seller.displayName} className="size-12 text-base" />
                <div>
                  <Link href={`/sellers/${listing.seller.id}`} className="flex items-center gap-1.5 font-semibold hover:text-forest">
                    {listing.seller.displayName}
                    {verified && <BadgeCheck className="size-4 text-forest" aria-label="Verified seller" />}
                  </Link>
                  <p className="text-sm text-ink-soft">{listing.seller.sellerType === "BUSINESS" ? "Small business" : "Individual"} · {listing.seller.area} · on Borrowly since {formatDay(listing.seller.createdAt)}</p>
                </div>
              </div>
              <div className="text-right">
                <Rating sum={listing.seller.ratingSum} count={listing.seller.ratingCount} size="md" />
                <p className="mt-1 text-xs text-ink-faint">Verification: {VERIFICATION_LABEL[listing.seller.verificationStatus]}</p>
              </div>
            </div>
            {listing.seller.bio && <p className="mt-4 text-sm text-ink-soft">{listing.seller.bio}</p>}
            <p className="mt-4 text-xs text-ink-faint">Exact pickup address is shared only after the seller confirms your booking or order.</p>
          </section>

          <section className="mt-10" aria-labelledby="reviews">
            <h2 id="reviews" className="text-lg font-bold">Reviews {listing.ratingCount > 0 && <span className="font-normal text-ink-soft">({listing.ratingCount})</span>}</h2>
            {reviews.length ? (
              <ul className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <li key={r.id} className="border-b border-line pb-4 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold"><Avatar name={r.author.name} className="size-7 text-xs" />{r.author.name}</p>
                      <span className="text-xs text-ink-faint">{formatDay(r.createdAt)}</span>
                    </div>
                    <div className="mt-2"><Stars value={r.rating} /></div>
                    <p className="mt-1.5 text-sm text-ink-soft">{r.comment}</p>
                    <p className="mt-1 text-xs text-ink-faint">Verified {r.bookingId ? "rental" : "purchase"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">No reviews yet. Reviews can only be written after a completed rental or purchase.</p>
            )}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <BookingPanel
            listing={{
              id: listing.id,
              rentalEnabled: listing.rentalEnabled,
              purchaseEnabled: listing.purchaseEnabled,
              dailyRatePaise: listing.dailyRatePaise,
              depositPaise: listing.depositPaise,
              salePricePaise: listing.salePricePaise,
              minRentalDays: listing.minRentalDays,
              maxRentalDays: listing.maxRentalDays,
              stockQuantity: listing.stockQuantity,
              status: listing.status,
            }}
            signedIn={!!user}
            isOwner={isOwner}
            serviceFeeBps={settings.customerFeeBps}
          />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">More in {listing.category.name}</h2>
          <ListingGrid listings={related} />
        </section>
      )}
    </div>
  );
}
