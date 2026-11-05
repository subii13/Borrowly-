import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { searchListings, searchParamsSchema } from "@/modules/listings/search";

/** Public read-only search API: GET /api/listings?q=camera&area=Peelamedu&mode=rent&sort=price_asc */
export async function GET(req: Request) {
  const filters = searchParamsSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const r = await searchListings(db, filters);
  return NextResponse.json({
    total: r.total,
    page: r.page,
    pages: r.pages,
    items: r.items.map((l) => ({
      id: l.id,
      title: l.title,
      category: l.category.slug,
      area: l.area,
      condition: l.condition,
      rentalEnabled: l.rentalEnabled,
      purchaseEnabled: l.purchaseEnabled,
      dailyRatePaise: l.dailyRatePaise,
      depositPaise: l.depositPaise,
      salePricePaise: l.salePricePaise,
      image: l.images[0]?.url ?? null,
      seller: { id: l.seller.id, name: l.seller.displayName, verified: l.seller.verificationStatus === "VERIFIED" },
    })),
  });
}
