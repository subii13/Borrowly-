import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <ContentPage eyebrow="Contact" title="Talk to the Borrowly team" intro="We're a small team based in Coimbatore.">
      <section>
        <h2>Support</h2>
        <p>For a problem with a booking or order, open it from your account and choose “Report a problem” — that keeps all the evidence in one place.</p>
      </section>
      <section>
        <h2>Everything else</h2>
        <ul>
          <li>General: hello@borrowly.demo</li>
          <li>Sellers and partnerships: sellers@borrowly.demo</li>
        </ul>
        <p className="text-sm">These are placeholder addresses for the demonstration build.</p>
      </section>
    </ContentPage>
  );
}
