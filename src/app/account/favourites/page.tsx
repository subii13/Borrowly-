import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/session";
import { cardInclude } from "@/modules/listings/search";
import { ListingCard } from "@/components/marketplace/listing-card";
import { EmptyState, PageHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Favourites" };

export default async function FavouritesPage() {
  const { user } = await requireUserPage("/account/favourites");
  const favs = await db.favourite.findMany({ where: { userId: user.id }, include: { listing: { include: cardInclude } }, orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Favourites" description="Items you've saved for later." />
      {favs.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{favs.map((f) => <ListingCard key={f.listingId} listing={f.listing} />)}</div>
      ) : (
        <EmptyState icon={Heart} title="No favourites yet" body="Tap Save on any listing to keep it here." action={<ButtonLink href="/explore" size="sm">Explore</ButtonLink>} />
      )}
    </>
  );
}
