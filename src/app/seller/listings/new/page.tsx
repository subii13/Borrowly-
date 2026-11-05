import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { AREAS } from "@/lib/constants";
import { createListingAction } from "@/app/actions/seller";
import { ListingWizard } from "@/components/forms/listing-wizard";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Create listing" };

export default async function NewListingPage() {
  const { actor } = await requireSellerPage();
  const [categories, seller] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } }),
  ]);
  const area = AREAS.find((a) => a.name === seller.area);
  return (
    <>
      <PageHeader title="Create a listing" description="Seven quick steps. You can save a draft at the end and publish later." />
      <ListingWizard
        mode="create"
        categories={categories}
        submit={createListingAction}
        initial={{
          title: "",
          description: "",
          categoryId: "",
          brand: "",
          model: "",
          condition: "GOOD",
          images: [],
          rentalEnabled: true,
          purchaseEnabled: false,
          dailyRate: "",
          deposit: "",
          salePrice: "",
          stockQuantity: 1,
          minRentalDays: 1,
          maxRentalDays: 30,
          area: (area?.name ?? "") as never,
          pincode: area?.pincode ?? seller.pincode,
          publish: true,
        }}
      />
    </>
  );
}
