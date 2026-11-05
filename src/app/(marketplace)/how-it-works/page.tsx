import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "How it works" };

export default function HowItWorksPage() {
  return (
    <ContentPage eyebrow="How it works" title="Renting and buying on Borrowly" intro="Every step is recorded so both sides know where they stand.">
      <section>
        <h2>Renting</h2>
        <ul>
          <li><strong>Pick dates.</strong> The calendar shows live availability. Rentals run from the pickup date up to (not including) the return date — 2 Nov to 5 Nov is 3 days.</li>
          <li><strong>Check out.</strong> Your dates are held for a few minutes while you pay. You see the daily rate, service fee and refundable deposit before paying.</li>
          <li><strong>Seller confirms.</strong> Once confirmed, the exact pickup address and phone number are shared with you.</li>
          <li><strong>Handover.</strong> Both of you confirm pickup in the app with notes and photos. The rental becomes active.</li>
          <li><strong>Return.</strong> Both confirm the return. The deposit is released, minus any late fee if the item came back late.</li>
          <li><strong>Review.</strong> Completed rentals can be reviewed once.</li>
        </ul>
      </section>
      <section>
        <h2>Buying pre-owned</h2>
        <ul>
          <li>Pay to reserve the item — it leaves stock immediately so nobody else can buy it.</li>
          <li>The seller accepts and arranges pickup, then confirms the handover.</li>
          <li>You confirm receipt to complete the order.</li>
        </ul>
      </section>
      <section>
        <h2>If something goes wrong</h2>
        <p>Open the booking or order and choose “Report a problem”. Borrowly support reviews the evidence from both sides and records any refund decision.</p>
      </section>
      <p><Link href="/explore">Start exploring →</Link></p>
    </ContentPage>
  );
}
