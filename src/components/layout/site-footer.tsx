import Link from "next/link";
import { Logo } from "./logo";

const columns = [
  { title: "Marketplace", links: [["Explore", "/explore"], ["How it works", "/how-it-works"], ["Explore the demo", "/demo"]] },
  { title: "Sellers", links: [["Sell on Borrowly", "/sell"], ["Seller dashboard", "/seller"], ["Seller verification", "/seller/verification"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"], ["Help & FAQ", "/faq"]] },
  { title: "Legal", links: [["Terms", "/terms"], ["Privacy", "/privacy"], ["Image credits", "/credits"]] },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.3fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-soft">Own less. Access more. A peer-to-peer rental and pre-owned marketplace, launching in Coimbatore.</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold">{col.title}</h3>
            <ul className="mt-3 space-y-2.5 text-sm">
              {col.links.map(([label, href]) => (
                <li key={href}><Link href={href} className="text-ink-soft hover:text-forest">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-ink-faint sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Borrowly. A demonstration build — payments are simulated and no real money is charged.</p>
          <p>Made in Coimbatore, Tamil Nadu</p>
        </div>
      </div>
    </footer>
  );
}
