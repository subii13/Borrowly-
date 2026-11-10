import type { Metadata } from "next";
import { BadgeCheck, CalendarRange, IndianRupee, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { getSettings } from "@/modules/platform/service";
import { ButtonLink } from "@/components/ui/button";
import { SafeImage } from "@/components/ui/safe-image";

export const metadata: Metadata = { title: "Sell on Borrowly" };

export default async function SellPage() {
  const s = await getSettings(db);
  return (
    <>
      <section className="container-page grid items-center gap-10 py-14 lg:grid-cols-2">
        <div>
          <p className="eyebrow">For sellers</p>
          <h1 className="mt-3 text-5xl font-extrabold leading-tight">Have something sitting unused?</h1>
          <p className="mt-4 text-lg text-ink-soft">Rent it out by the day, sell it pre-owned, or both — to neighbours across Coimbatore. Individuals and small businesses welcome.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/seller/listings/new" size="lg">List an item</ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary" size="lg">How it works</ButtonLink>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line">
          <SafeImage src="/images/categories/tools-diy.webp" alt="A workshop bench with tools" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>
      <section className="container-page grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: IndianRupee, title: "Keep most of it", body: `Borrowly's commission is ${s.commissionBps / 100}% of completed transactions. No listing fees.` },
          { icon: CalendarRange, title: "Your calendar, your rules", body: "Set daily rates, deposits, minimum and maximum rental days and stock." },
          { icon: ShieldCheck, title: "Documented handovers", body: "Both sides confirm pickup and return with notes and photos that can't be edited later." },
          { icon: BadgeCheck, title: "Earn the verified badge", body: "Confirm your email and phone and pass a quick profile review." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="card p-6">
            <Icon className="size-5 text-brand" />
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-ink-soft">{body}</p>
          </div>
        ))}
      </section>
    </>
  );
}
