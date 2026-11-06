"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { CalendarDays, ChevronLeft, ChevronRight, Info, Loader2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/money";
import { createHoldAction } from "@/app/actions/marketplace";
import { Button, ButtonLink } from "@/components/ui/button";

type Listing = {
  id: string;
  rentalEnabled: boolean;
  purchaseEnabled: boolean;
  dailyRatePaise: number | null;
  depositPaise: number | null;
  salePricePaise: number | null;
  minRentalDays: number;
  maxRentalDays: number;
  stockQuantity: number;
  status: string;
};

type Quote = {
  quote: { days: number; rentalSubtotalPaise: number; depositPaise: number; serviceFeePaise: number; totalPaise: number };
  available: number;
  isAvailable: boolean;
};

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);
const fromIso = (s: string) => new Date(`${s}T00:00:00Z`);

export function BookingPanel({ listing, signedIn, isOwner, serviceFeeBps, initialDates }: { listing: Listing; signedIn: boolean; isOwner: boolean; serviceFeeBps: number; initialDates?: { start: string; end: string } | null }) {
  const router = useRouter();
  const canRent = listing.rentalEnabled && listing.dailyRatePaise !== null && listing.status === "ACTIVE";
  const canBuy = listing.purchaseEnabled && listing.salePricePaise !== null && listing.status === "ACTIVE";
  const [mode, setMode] = useState<"rent" | "buy">(canRent ? "rent" : "buy");
  const [days, setDays] = useState<{ date: string; available: number }[]>([]);
  // Dates from a voice search arrive pre-selected; the server still re-checks availability and price.
  const [start, setStart] = useState<string | null>(initialDates?.start ?? null);
  const [end, setEnd] = useState<string | null>(initialDates?.end ?? null);
  const [month, setMonth] = useState(() => {
    if (!initialDates) return 0;
    const now = new Date();
    const s = new Date(`${initialDates.start}T00:00:00Z`);
    return Math.max(0, Math.min(2, (s.getUTCFullYear() - now.getUTCFullYear()) * 12 + s.getUTCMonth() - now.getUTCMonth()));
  });
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!canRent) return;
    fetch(`/api/listings/${listing.id}/availability?days=92`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { days: [] }))
      .then((d) => setDays(d.days ?? []))
      .catch(() => setDays([]));
  }, [canRent, listing.id]);

  useEffect(() => {
    setQuote(null);
    setQuoteError(null);
    if (!start || !end) return;
    const ctrl = new AbortController();
    fetch(`/api/listings/${listing.id}/quote?start=${start}&end=${end}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setQuoteError(d.error ?? "Could not price those dates");
        else setQuote(d);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [start, end, listing.id]);

  const availability = useMemo(() => new Map(days.map((d) => [d.date, d.available])), [days]);
  const today = days[0]?.date;

  const monthStart = useMemo(() => {
    const base = today ? fromIso(today) : new Date();
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + month, 1));
  }, [today, month]);

  const cells = useMemo(() => {
    const first = monthStart.getUTCDay();
    const count = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
    return [...Array<null>(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(monthStart.getTime() + i * DAY)))];
  }, [monthStart]);

  // A rental night is "blocked" when no unit is free that day. The return day itself need not be free.
  const rangeIsFree = (a: string, b: string) => {
    for (let t = fromIso(a).getTime(); t < fromIso(b).getTime(); t += DAY) if ((availability.get(iso(new Date(t))) ?? 0) < 1) return false;
    return true;
  };

  const pick = (d: string) => {
    if (!start || (start && end) || d <= start) {
      if ((availability.get(d) ?? 0) < 1) return;
      setStart(d);
      setEnd(null);
      return;
    }
    if (!rangeIsFree(start, d)) {
      toast.error("Some of those dates are already booked");
      return;
    }
    setEnd(d);
  };

  const reserve = () =>
    startTransition(async () => {
      if (!signedIn) return router.push(`/login?next=/listings/${listing.id}`);
      const r = await createHoldAction(listing.id, { startDate: start, endDate: end, quantity: 1 });
      if (!r.ok) return void toast.error(r.error);
      router.push(r.data);
    });

  if (!canRent && !canBuy) {
    return (
      <div className="card p-5">
        <p className="font-semibold">{listing.status === "SOLD_OUT" ? "This item has sold out" : "This listing is not available right now"}</p>
        <p className="mt-1 text-sm text-ink-soft">Save it to your favourites or browse similar items below.</p>
      </div>
    );
  }

  const nights = start && end ? Math.round((fromIso(end).getTime() - fromIso(start).getTime()) / DAY) : 0;
  const lastMonth = month >= 2;

  return (
    <div className="card overflow-hidden">
      {canRent && canBuy && (
        <div className="grid grid-cols-2 border-b border-line p-1.5" role="tablist" aria-label="Rent or buy">
          {(["rent", "buy"] as const).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={clsx("rounded-lg py-2.5 text-sm font-semibold", mode === m ? "bg-forest text-white" : "text-ink-soft hover:bg-canvas")}>
              {m === "rent" ? `Rent · ${formatINR(listing.dailyRatePaise)}/day` : `Buy · ${formatINR(listing.salePricePaise)}`}
            </button>
          ))}
        </div>
      )}

      {mode === "rent" && canRent ? (
        <div className="p-5">
          <div className="flex items-baseline justify-between">
            <p><span className="font-display text-2xl font-bold">{formatINR(listing.dailyRatePaise)}</span><span className="text-ink-soft"> / day</span></p>
            <p className="text-sm text-ink-soft">Deposit {formatINR(listing.depositPaise)}</p>
          </div>
          <p className="mt-1 text-xs text-ink-faint">Min {listing.minRentalDays} day{listing.minRentalDays > 1 ? "s" : ""} · max {listing.maxRentalDays} days · {listing.stockQuantity} unit{listing.stockQuantity > 1 ? "s" : ""}</p>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => setMonth((m) => Math.max(0, m - 1))} disabled={month === 0} className="grid size-9 place-items-center rounded-lg hover:bg-canvas disabled:opacity-30" aria-label="Previous month"><ChevronLeft className="size-4" /></button>
              <p className="text-sm font-semibold">{monthStart.toLocaleString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })}</p>
              <button type="button" onClick={() => setMonth((m) => m + 1)} disabled={lastMonth} className="grid size-9 place-items-center rounded-lg hover:bg-canvas disabled:opacity-30" aria-label="Next month"><ChevronRight className="size-4" /></button>
            </div>
            <div className="grid grid-cols-7 text-center text-[11px] font-medium text-ink-faint">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label="Choose rental dates">
              {cells.map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const known = availability.has(d);
                const free = (availability.get(d) ?? 0) > 0;
                const inRange = start && end && d > start && d < end;
                const isEdge = d === start || d === end;
                const selectable = known && (free || (start && !end && d > start));
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={!selectable}
                    onClick={() => pick(d)}
                    aria-label={`${d}${!free && known ? " (booked)" : ""}`}
                    aria-pressed={!!isEdge}
                    className={clsx(
                      "mx-auto grid size-9 place-items-center rounded-lg text-sm tabular-nums",
                      isEdge && "bg-forest font-semibold text-white",
                      inRange && "bg-forest-50 text-forest",
                      !isEdge && !inRange && selectable && "hover:bg-canvas",
                      known && !free && !isEdge && "text-ink-faint line-through decoration-rose/60",
                      !known && "text-line-strong",
                    )}
                  >
                    {Number(d.slice(8))}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-soft">
              <CalendarDays className="size-3.5" />
              {!start ? "Select your pickup date" : !end ? "Now select your return date" : `${nights} day${nights > 1 ? "s" : ""}: ${start} → ${end} (return day not charged)`}
            </p>
          </div>

          {quoteError && <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose">{quoteError}</p>}
          {quote && (
            <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
              <Row label={`${formatINR(listing.dailyRatePaise)} × ${quote.quote.days} day${quote.quote.days > 1 ? "s" : ""}`} value={formatINR(quote.quote.rentalSubtotalPaise)} />
              <Row label={`Service fee (${serviceFeeBps / 100}%)`} value={formatINR(quote.quote.serviceFeePaise)} />
              <Row label="Refundable deposit" value={formatINR(quote.quote.depositPaise)} />
              <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>Total due</dt><dd>{formatINR(quote.quote.totalPaise)}</dd></div>
              {!quote.isAvailable && <p className="text-rose">Those dates are no longer available.</p>}
            </dl>
          )}

          {isOwner ? (
            <p className="mt-5 rounded-lg bg-canvas px-3 py-2.5 text-sm text-ink-soft">This is your listing. <a href="/seller/listings" className="font-medium text-forest">Manage it</a></p>
          ) : (
            <Button className="mt-5 w-full" size="lg" disabled={!quote?.isAvailable || pending} onClick={reserve}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {signedIn ? "Reserve these dates" : "Log in to rent"}
            </Button>
          )}
          <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-faint"><Info className="mt-0.5 size-3.5 shrink-0" />Dates are held for a few minutes while you check out. Prices are calculated by Borrowly, not your browser.</p>
        </div>
      ) : (
        <div className="p-5">
          <p className="font-display text-2xl font-bold">{formatINR(listing.salePricePaise)}</p>
          <p className="mt-1 text-sm text-ink-soft">Pre-owned · pick up from the seller after they accept your order</p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>• Pay now (demo payment) — the item is reserved for you immediately</li>
            <li>• Seller accepts and arranges handover</li>
            <li>• Confirm receipt in the app to complete the order</li>
          </ul>
          {isOwner ? (
            <p className="mt-5 rounded-lg bg-canvas px-3 py-2.5 text-sm text-ink-soft">This is your listing.</p>
          ) : (
            <ButtonLink href={signedIn ? `/checkout/buy/${listing.id}` : `/login?next=/checkout/buy/${listing.id}`} className="mt-5 w-full" size="lg">
              <ShoppingBag className="size-4" /> {signedIn ? "Buy now" : "Log in to buy"}
            </ButtonLink>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
