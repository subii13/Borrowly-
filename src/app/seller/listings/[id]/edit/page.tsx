import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { paiseToRupeeString } from "@/lib/money";
import { updateListingAction } from "@/app/actions/seller";
import { ListingWizard } from "@/components/forms/listing-wizard";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Edit listing" };

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { actor } = await requireSellerPage();
  const [listing, categories] = await Promise.all([
    db.listing.findUnique({ where: { id }, include: { images: { orderBy: { sortOrder: "asc" } } } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } }),
  ]);
  // Ownership enforced here and again in the update service.
  if (!listing || listing.sellerId !== actor.sellerId || listing.status === "SUSPENDED") notFound();
  return (
    <>
      <PageHeader title="Edit listing" description={listing.title} />
      <ListingWizard
        mode="edit"
        categories={categories}
        submit={updateListingAction.bind(null, listing.id)}
        initial={{
          title: listing.title,
          description: listing.description,
          categoryId: listing.categoryId,
          brand: listing.brand ?? "",
          model: listing.model ?? "",
          condition: listing.condition,
          images: listing.images.map((i) => ({ id: i.id, url: i.url })),
          rentalEnabled: listing.rentalEnabled,
          purchaseEnabled: listing.purchaseEnabled,
          dailyRate: paiseToRupeeString(listing.dailyRatePaise),
          deposit: paiseToRupeeString(listing.depositPaise),
          salePrice: paiseToRupeeString(listing.salePricePaise),
          stockQuantity: listing.stockQuantity,
          minRentalDays: listing.minRentalDays,
          maxRentalDays: listing.maxRentalDays,
          area: listing.area as never,
          pincode: listing.pincode,
          publish: listing.status === "ACTIVE",
        }}
      />
    </>
  );
}
