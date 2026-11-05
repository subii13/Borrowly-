import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { daysBetween, formatRange } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { requireUserPage } from "@/lib/session";
import { getSettings } from "@/modules/platform/service";
import { rentalQuote } from "@/modules/pricing/pricing";
import { payRentalAction } from "@/app/actions/marketplace";
import { PayForm } from "@/components/product/pay-form";
import { SafeImage } from "@/components/ui/safe-image";
import { ButtonLink } from "@/components/ui/button";
import { DefinitionList } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Checkout" };

export default async function RentCheckoutPage({ params }: { params: Promise<{ holdId: string }> }) {
  const { holdId } = await params;
  const { user } = await requireUserPage(`/checkout/rent/${holdId}`);
  const hold = await db.bookingHold.findUnique({
    where: { id: holdId },
    include: { listing: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, seller: { select: { displayName: true } } } }, booking: { select: { id: true } } },
  });
  if (!hold || hold.customerId !== user.id) notFound();
  if (hold.booking) return <Done href={`/account/bookings/${hold.booking.id}`} />;

  const expired = hold.status !== "ACTIVE" || hold.expiresAt <= new Date();
  const settings = await getSettings(db);
  // Displayed totals use the same server-side function the payment step uses.
  const q = rentalQuote({ dailyRatePaise: hold.listing.dailyRatePaise ?? 0, depositPaise: hold.listing.depositPaise ?? 0, days: daysBetween(hold.startDate, hold.endDate), quantity: hold.quantity, ...settings });
  const minutesLeft = Math.max(0, Math.ceil((hold.expiresAt.getTime() - Date.now()) / 60_000));

  return (
    <div className="container-page max-w-5xl py-10">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-ink-soft">Review your rental and complete the demo payment.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="card p-6">
          {expired ? (
            <div>
              <p className="font-semibold text-rose">Your reservation has expired</p>
              <p className="mt-1 text-sm text-ink-soft">The dates were released so others could book them. Pick your dates again to continue.</p>
              <ButtonLink href={`/listings/${hold.listingId}`} className="mt-4">Choose dates again</ButtonLink>
            </div>
          ) : (
            <>
              <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-forest-50 px-3 py-1 text-sm text-forest"><Clock className="size-4" />Dates held for about {minutesLeft} more minute{minutesLeft === 1 ? "" : "s"}</p>
              <PayForm total={formatINR(q.totalPaise)} idempotencyKey={`rent_${randomToken(16)}`} pay={payRentalAction.bind(null, hold.id)} successPath="/account/bookings/:id?new=1" failurePath="/account/bookings/:id" />
            </>
          )}
        </div>
        <aside className="card h-fit p-6">
          <div className="flex gap-4">
            <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-lg">
              <SafeImage src={hold.listing.images[0]?.url ?? ""} alt="" fill sizes="112px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <Link href={`/listings/${hold.listingId}`} className="line-clamp-2 font-semibold hover:text-forest">{hold.listing.title}</Link>
              <p className="mt-1 text-sm text-ink-soft">{hold.listing.seller.displayName} · {hold.listing.area}</p>
            </div>
          </div>
          <p className="mt-5 text-sm font-medium">{formatRange(hold.startDate, hold.endDate)}</p>
          <div className="mt-3">
            <DefinitionList
              items={[
                [`Rental (${formatINR(q.dailyRatePaise)} × ${q.days} day${q.days > 1 ? "s" : ""})`, formatINR(q.rentalSubtotalPaise)],
                [`Service fee (${settings.customerFeeBps / 100}%)`, formatINR(q.serviceFeePaise)],
                ["Refundable deposit", formatINR(q.depositPaise)],
                ["Total", <span key="t" className="text-base">{formatINR(q.totalPaise)}</span>],
              ]}
            />
          </div>
          <p className="mt-4 text-xs text-ink-faint">The deposit is returned (in this demo, recorded as a refund) when both parties confirm the return. The seller confirms your request after payment.</p>
        </aside>
      </div>
    </div>
  );
}

function Done({ href }: { href: string }) {
  return (
    <div className="container-page max-w-xl py-20 text-center">
      <h1 className="text-2xl font-bold">This checkout is already complete</h1>
      <ButtonLink href={href} className="mt-6">View booking</ButtonLink>
    </div>
  );
}
