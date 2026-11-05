import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of use" intro="Demonstration terms for the Borrowly MVP. These are placeholders and have not been reviewed by a lawyer.">
      <section>
        <h2>1. The service</h2>
        <p>Borrowly provides a platform where people list items for rent or sale and others book or buy them. Borrowly is not the owner of listed items and is not a party to the rental or sale itself.</p>
      </section>
      <section>
        <h2>2. Payments</h2>
        <p>In this demonstration build, all payments are simulated and no money is collected. A production version would process payments through a regulated payment partner; Borrowly would not hold customer funds in escrow itself.</p>
      </section>
      <section>
        <h2>3. Deposits, damage and late returns</h2>
        <p>Rentals may require a refundable deposit. Late returns may incur a fee of the daily rate per late day, capped at the deposit. Damage claims are handled through the dispute process.</p>
      </section>
      <section>
        <h2>4. Prohibited items</h2>
        <p>Weapons, drugs, counterfeit goods, items requiring a licence, and anything illegal to rent or sell in India may not be listed.</p>
      </section>
      <section>
        <h2>5. Accounts</h2>
        <p>You are responsible for activity on your account. Borrowly may suspend accounts or listings that break these terms.</p>
      </section>
    </ContentPage>
  );
}
