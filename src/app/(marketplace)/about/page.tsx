import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "About Borrowly" };

export default function AboutPage() {
  return (
    <ContentPage eyebrow="About" title="The Amazon for things you don't need to own" intro="Borrowly is a peer-to-peer rental and pre-owned marketplace, launching in Coimbatore.">
      <section>
        <h2>The problem</h2>
        <p>Most of us buy expensive things we use a handful of times a year — a DSLR for a wedding, a drill for one shelf, a tent for one trek. Meanwhile the same items sit idle in cupboards across the city. Informal rentals over WhatsApp lack availability calendars, receipts, seller trust and any way to settle “it was already scratched”.</p>
      </section>
      <section>
        <h2>What we&apos;re building</h2>
        <ul>
          <li>Rent or buy from the same listing.</li>
          <li>Verified seller profiles and real-time availability.</li>
          <li>Structured bookings, documented handovers and returns, and a dispute process.</li>
          <li>An inventory and earnings dashboard for individuals and small businesses.</li>
        </ul>
      </section>
      <section>
        <h2>Why Coimbatore</h2>
        <p>A dense mix of colleges, small manufacturers, wedding halls and weekend trekkers — and neighbourhoods like Peelamedu, RS Puram and Saravanampatti where the nearest owner is often a few streets away.</p>
      </section>
      <section>
        <h2>Business model</h2>
        <p>Borrowly earns a configurable 5–10% commission on completed transactions plus a small customer service fee. Paid listing plans and seller subscriptions are future options.</p>
      </section>
      <p className="text-sm">This website is a demonstration build: listings and people are sample data and payments are simulated.</p>
    </ContentPage>
  );
}
