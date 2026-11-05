import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy policy" intro="What Borrowly collects and why. Placeholder text for the demonstration build.">
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email, a hashed password, optional phone and area.</li>
          <li>Seller details: display name, area, pincode, an optional private pickup address and phone.</li>
          <li>Transaction records: bookings, orders, demo payments, handover notes and photos, reviews and disputes.</li>
        </ul>
        <p>We do not collect Aadhaar or other government identity documents.</p>
      </section>
      <section>
        <h2>Who can see what</h2>
        <ul>
          <li>Public: listings, seller display name, area, ratings and reviews.</li>
          <li>Counterparties only: pickup address and phone, shared after a booking is confirmed or an order accepted.</li>
          <li>Transaction parties and administrators only: handover, return and dispute evidence.</li>
        </ul>
      </section>
      <section>
        <h2>Photos</h2>
        <p>Uploaded photos are re-encoded, which removes embedded metadata such as GPS location.</p>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>We use one essential, HTTP-only session cookie to keep you signed in, and an optional cookie to remember your chosen area. No advertising trackers.</p>
      </section>
    </ContentPage>
  );
}
