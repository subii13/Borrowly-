import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { Rating } from "@/components/ui/primitives";
import { CONDITION_LABEL } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import type { ListingCardData } from "@/modules/listings/search";

export function ListingCard({ listing, priority, linkSuffix = "" }: { listing: ListingCardData; priority?: boolean; linkSuffix?: string }) {
  const image = listing.images[0];
  const soldOut = listing.status === "SOLD_OUT";
  return (
    <Link href={`/listings/${listing.id}${linkSuffix}`} className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-card transition-shadow hover:shadow-[var(--shadow-lift)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <SafeImage
          src={image?.url ?? ""}
          alt={image?.alt ?? listing.title}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {listing.rentalEnabled && <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-forest shadow-sm">Rent</span>}
          {listing.purchaseEnabled && <span className="rounded-md bg-ink/85 px-2 py-0.5 text-xs font-semibold text-white shadow-sm">Buy</span>}
        </div>
        {soldOut && <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-xs font-semibold text-rose">Sold out</span>}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
          <span className="truncate">{listing.category.name}</span>
          <Rating sum={listing.ratingSum} count={listing.ratingCount} />
        </div>
        <h3 className="mt-1.5 line-clamp-2 font-display text-[15px] font-semibold leading-snug text-ink group-hover:text-forest">{listing.title}</h3>
        <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-soft">
          <span className="truncate">{listing.seller.displayName}</span>
          {listing.seller.verificationStatus === "VERIFIED" && <BadgeCheck className="size-3.5 shrink-0 text-forest" aria-label="Verified seller" />}
        </p>
        <div className="mt-1 flex items-center gap-3 text-xs text-ink-faint">
          <span className="inline-flex items-center gap-1"><MapPin className="size-3" aria-hidden />{listing.area}</span>
          <span>{CONDITION_LABEL[listing.condition]}</span>
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          {listing.rentalEnabled && listing.dailyRatePaise !== null ? (
            <p><span className="font-display text-lg font-bold">{formatINR(listing.dailyRatePaise)}</span><span className="text-sm text-ink-soft"> /day</span></p>
          ) : (
            <p className="font-display text-lg font-bold">{formatINR(listing.salePricePaise)}</p>
          )}
          {listing.rentalEnabled && listing.purchaseEnabled && <p className="text-xs text-ink-soft">or buy {formatINR(listing.salePricePaise)}</p>}
        </div>
        <p className="mt-1 text-xs">
          {soldOut ? <span className="text-rose">Not available</span> : <span className="text-forest">{listing.stockQuantity > 1 ? `${listing.stockQuantity} units available` : "Available"}</span>}
        </p>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings, linkSuffix }: { listings: ListingCardData[]; linkSuffix?: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {listings.map((l, i) => <ListingCard key={l.id} listing={l} priority={i < 4} linkSuffix={linkSuffix} />)}
    </div>
  );
}
