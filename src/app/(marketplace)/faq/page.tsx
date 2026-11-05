import type { Metadata } from "next";
import { ContentPage } from "@/components/layout/content-page";

export const metadata: Metadata = { title: "Help & FAQ" };

const faqs: [string, string][] = [
  ["Is any real money charged?", "No. This is a demonstration build. Every payment uses a simulated provider and is clearly labelled as a demo payment."],
  ["How is the rental price calculated?", "Daily rate × number of days × quantity, plus a small service fee and a refundable deposit. Days are counted from the pickup date up to, but not including, the return date. All prices are calculated on Borrowly's servers."],
  ["What does “Verified seller” mean?", "The seller confirmed their email and phone number and a Borrowly team member reviewed their profile. It is not a government ID check — we deliberately do not collect Aadhaar in this version."],
  ["When do I see the seller's address?", "Only after the seller confirms your booking or accepts your order. Public pages show just the area and pincode."],
  ["Can I cancel?", "Customers can cancel a booking before the rental starts, and an order before the seller accepts it. Cancelled demo payments are refunded in full."],
  ["What if the item is damaged or not as described?", "Open the booking or order and choose “Report a problem”. Attach photos; both parties' handover evidence is available to the reviewer."],
  ["What happens if I return late?", "The rental is flagged as overdue and a late fee of the daily rate per late day (capped at the deposit) is kept from the deposit."],
  ["Can I both rent and sell?", "Yes — one account can rent, buy and sell. Create a seller profile from your account menu."],
];

export default function FaqPage() {
  return (
    <ContentPage eyebrow="Help" title="Frequently asked questions">
      <div className="divide-y divide-line rounded-2xl border border-line bg-white" id="help">
        {faqs.map(([q, a]) => (
          <details key={q} className="p-5">
            <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
            <p className="mt-2">{a}</p>
          </details>
        ))}
      </div>
    </ContentPage>
  );
}
