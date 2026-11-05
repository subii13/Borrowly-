import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { formatINR } from "@/lib/money";
import { CONDITION_LABEL } from "@/lib/constants";
import { requireUserPage } from "@/lib/session";
import { toSafeError } from "@/lib/errors";
import { quotePurchase } from "@/modules/purchases/service";
import { getSettings } from "@/modules/platform/service";
import { payPurchaseAction } from "@/app/actions/marketplace";
import { PayForm } from "@/components/product/pay-form";
import { SafeImage } from "@/components/ui/safe-image";
import { ButtonLink } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Checkout" };

export default async function BuyCheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = await params;
  const { actor } = await requireUserPage(`/checkout/buy/${listingId}`);
  const listing = await db.listing.findUnique({ where: { id: listingId }, include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, seller: { select: { displayName: true } } } });
  if (!listing) notFound();
  let quote: Awaited<ReturnType<typeof quotePurchase>> | null = null;
  let problem: string | null = null;
  try {
    quote = await quotePurchase(db, actor, listingId);
  } catch (err) {
    problem = toSafeError(err).error;
  }
  const settings = await getSettings(db);

  return (
    <div className="container-page max-w-5xl py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-ink-soft">Buying pre-owned from {listing.seller.displayName}.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card p-6">
          {problem || !quote ? (
            <div>
              <p className="font-semibold text-rose">{problem}</p>
              <ButtonLink href={`/listings/${listingId}`} variant="secondary" className="mt-4">Back to listing</ButtonLink>
            </div>
          ) : (
            <PayForm total={formatINR(quote.totalPaise)} idempotencyKey={`buy_${randomToken(16)}`} pay={payPurchaseAction.bind(null, listingId)} successPath="/account/purchases/:id?new=1" failurePath="/account/purchases/:id" />
          )}
        </div>
        <aside className="card h-fit p-6">
          <div className="flex gap-4">
            <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg">
              <SafeImage src={listing.images[0]?.url ?? ""} alt="" fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <Link href={`/listings/${listingId}`} className="line-clamp-2 font-semibold hover:text-forest">{listing.title}</Link>
              <p className="mt-1 text-sm text-ink-soft">{CONDITION_LABEL[listing.condition]} · {listing.area}</p>
            </div>
          </div>
          {quote && (
            <div className="mt-5">
              <DefinitionList
                items={[
                  ["Item price", formatINR(quote.subtotalPaise)],
                  [`Service fee (${settings.customerFeeBps / 100}%)`, formatINR(quote.serviceFeePaise)],
                  ["Total", <span key="t" className="text-base">{formatINR(quote.totalPaise)}</span>],
                ]}
              />
            </div>
          )}
          <p className="mt-4 text-xs text-ink-faint">The item is reserved for you as soon as payment succeeds. Pick it up after the seller accepts the order.</p>
        </aside>
      </div>
    </div>
  );
}
