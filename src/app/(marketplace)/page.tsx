import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarCheck, Camera, FileCheck2, HandCoins, MapPin, Mic, PackageSearch, ShieldCheck, Store } from "lucide-react";
import { db } from "@/lib/db";
import { AREAS, POPULAR_SEARCHES } from "@/lib/constants";
import { formatINR } from "@/lib/money";
import { cardInclude } from "@/modules/listings/search";
import { getSettings } from "@/modules/platform/service";
import { SearchBar } from "@/components/marketplace/search-bar";
import { ListingGrid } from "@/components/marketplace/listing-card";
import { SafeImage } from "@/components/ui/safe-image";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [categories, featured, areaCounts, totals, settings] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { listings: { where: { status: "ACTIVE" } } } } } }),
    db.listing.findMany({ where: { status: "ACTIVE" }, include: cardInclude, orderBy: [{ ratingCount: "desc" }, { createdAt: "desc" }], take: 8 }),
    db.listing.groupBy({ by: ["area"], where: { status: "ACTIVE" }, _count: true }),
    Promise.all([db.listing.count({ where: { status: "ACTIVE" } }), db.sellerProfile.count({ where: { verificationStatus: "VERIFIED" } })]),
    getSettings(db),
  ]);
  const hero = featured.filter((l) => l.rentalEnabled).slice(0, 3);
  const [activeListings, verifiedSellers] = totals;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container-page grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <p className="eyebrow">Now live in Coimbatore</p>
            <h1 className="mt-4 text-[44px] font-extrabold leading-[1.02] sm:text-6xl lg:text-[68px]">
              Own less.
              <br />
              <span className="text-forest">Access more.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-ink-soft">Rent or buy pre-owned items from verified individuals and small businesses in Coimbatore.</p>
            <div className="mt-8 max-w-xl">
              <SearchBar size="lg" />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-ink-faint">Popular:</span>
                {POPULAR_SEARCHES.map((s) => (
                  <Link key={s} href={`/explore?q=${encodeURIComponent(s)}`} className="rounded-full border border-line bg-white px-3 py-1 text-ink-soft hover:border-forest hover:text-forest">
                    {s}
                  </Link>
                ))}
              </div>
              <p className="mt-4 flex items-start gap-2 rounded-xl border border-forest/20 bg-forest-50/60 px-3.5 py-2.5 text-sm text-ink-soft">
                <Mic className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden />
                <span>
                  <span className="font-medium text-ink">Speak in Tamil, Tanglish or English.</span> Tap the mic and try <span lang="ta" className="text-forest">“Naalaiku oru DSLR camera venum, RS Puram la”</span>.{" "}
                  <Link href="/voice" className="font-medium text-forest underline underline-offset-2">Voice by Gnani AI</Link>
                </span>
              </p>
            </div>
            <dl className="mt-10 flex gap-8 text-sm">
              <div><dt className="text-ink-faint">Active listings</dt><dd className="font-display text-2xl font-bold">{activeListings}</dd></div>
              <div><dt className="text-ink-faint">Verified sellers</dt><dd className="font-display text-2xl font-bold">{verifiedSellers}</dd></div>
              <div><dt className="text-ink-faint">Neighbourhoods</dt><dd className="font-display text-2xl font-bold">{AREAS.length}</dd></div>
            </dl>
          </div>

          <div className="relative grid h-[420px] grid-cols-2 grid-rows-2 gap-3 sm:h-[520px]">
            {hero.map((l, i) => (
              <Link key={l.id} href={`/listings/${l.id}`} className={`group relative overflow-hidden rounded-2xl border border-line bg-white ${i === 0 ? "row-span-2" : ""}`}>
                <SafeImage src={l.images[0]?.url ?? ""} alt={l.title} fill priority sizes="(min-width: 1024px) 300px, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                <div className="absolute inset-x-2 bottom-2 rounded-xl bg-white/95 p-3 shadow-sm backdrop-blur">
                  <p className="line-clamp-1 text-sm font-semibold">{l.title}</p>
                  <p className="mt-0.5 flex items-center justify-between text-xs text-ink-soft">
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{l.area}</span>
                    <span className="font-semibold text-forest">{formatINR(l.dailyRatePaise)}/day</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container-page py-14" aria-labelledby="cat-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Categories</p>
            <h2 id="cat-heading" className="mt-2 text-3xl font-bold">What do you need this week?</h2>
          </div>
          <Link href="/explore" className="hidden items-center gap-1 text-sm font-medium text-forest hover:underline sm:inline-flex">All listings <ArrowRight className="size-4" /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.id} href={`/categories/${c.slug}`} className="group relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-2xl border border-line sm:aspect-[16/10]">
              <SafeImage src={c.imageUrl} alt="" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent" />
              <div className="relative p-3.5 text-white sm:p-5">
                <h3 className="font-display text-base font-bold text-white sm:text-xl">{c.name}</h3>
                <p className="mt-1 hidden text-sm text-white/80 sm:line-clamp-1">{c.description}</p>
                <p className="mt-1 text-xs font-medium text-white/90 sm:mt-2">{c._count.listings} {c._count.listings === 1 ? "listing" : "listings"}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container-page py-14" aria-labelledby="featured-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Featured near you</p>
            <h2 id="featured-heading" className="mt-2 text-3xl font-bold">Top-rated across Coimbatore</h2>
          </div>
          <Link href="/explore?sort=newest" className="hidden items-center gap-1 text-sm font-medium text-forest hover:underline sm:inline-flex">See more <ArrowRight className="size-4" /></Link>
        </div>
        <ListingGrid listings={featured} />
      </section>

      {/* Trust */}
      <section className="border-y border-line bg-white py-16">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow">Built for trust</p>
            <h2 className="mt-2 text-3xl font-bold">Every rental has a paper trail</h2>
            <p className="mt-3 text-ink-soft">Informal rentals break down over “who had it last” and “it was already scratched”. Borrowly records each step so both sides know where they stand.</p>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BadgeCheck, title: "Verified Sellers", body: "Sellers confirm their email and phone and are reviewed by our team before earning the verified badge." },
              { icon: ShieldCheck, title: "Secure Transaction Workflow", body: "Prices are calculated on our servers and bookings lock inventory, so no double-bookings or surprise totals." },
              { icon: FileCheck2, title: "Documented Handover", body: "Both parties confirm pickup and return with timestamped notes and photos that can't be edited afterwards." },
              { icon: MapPin, title: "Local Marketplace", body: "Pick up from neighbours in Peelamedu, RS Puram, Gandhipuram and more — no shipping, no waiting." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title}>
                <div className="grid size-11 place-items-center rounded-xl bg-forest-50 text-forest"><Icon className="size-5" aria-hidden /></div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container-page py-16" aria-labelledby="how-heading">
        <p className="eyebrow">How Borrowly works</p>
        <h2 id="how-heading" className="mt-2 text-3xl font-bold">Three steps, no strangers’ WhatsApp groups</h2>
        <ol className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: PackageSearch, title: "Find what you need", body: "Search hundreds of items by neighbourhood, price and condition. Check live availability for your dates." },
            { icon: CalendarCheck, title: "Rent or buy", body: "Pick dates to rent, or buy pre-owned outright. See the full price, deposit and fees before you pay." },
            { icon: HandCoins, title: "Pick up and enjoy", body: "Meet the seller, confirm the handover in the app, and return it on time to get your deposit back." },
          ].map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="card p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-ink-faint">0{i + 1}</span>
                <Icon className="size-5 text-forest" aria-hidden />
              </div>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
        <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-forest hover:underline">Read the full guide <ArrowRight className="size-4" /></Link>
      </section>

      {/* Coimbatore */}
      <section className="container-page" aria-labelledby="cbe-heading">
        <div className="grid overflow-hidden rounded-3xl bg-forest text-white lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-forest-100">Made for Coimbatore</p>
            <h2 id="cbe-heading" className="mt-3 text-3xl font-bold text-white sm:text-4xl">Your neighbourhood already owns it</h2>
            <p className="mt-4 max-w-md text-white/80">From wedding season in RS Puram to college fests in Peelamedu and treks out of Saravanampatti — rent from people a few kilometres away.</p>
            <ButtonLink href="/explore" variant="light" size="lg" className="mt-8">Browse near me</ButtonLink>
          </div>
          <div className="grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-4 lg:grid-cols-2">
            {AREAS.map((a) => {
              const n = areaCounts.find((c) => c.area === a.name)?._count ?? 0;
              return (
                <Link key={a.name} href={`/explore?area=${encodeURIComponent(a.name)}`} className="bg-forest p-5 transition-colors hover:bg-forest-dark">
                  <MapPin className="size-4 text-forest-100" aria-hidden />
                  <p className="mt-3 font-semibold">{a.name}</p>
                  <p className="text-sm text-white/70">{n} {n === 1 ? "listing" : "listings"} · {a.pincode}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Seller CTA */}
      <section className="container-page pt-16">
        <div className="card flex flex-col items-start gap-8 p-8 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <div className="flex gap-2 text-forest"><Camera className="size-5" /><Store className="size-5" /></div>
            <h2 className="mt-4 text-3xl font-bold">Have something sitting unused?</h2>
            <p className="mt-3 text-ink-soft">List it for rent, for sale, or both. Individuals and small businesses keep {(10_000 - settings.commissionBps) / 100}% of every completed transaction — you set the price, the deposit and the dates.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/seller/listings/new" size="lg">List an item</ButtonLink>
            <ButtonLink href="/sell" variant="secondary" size="lg">How selling works</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
