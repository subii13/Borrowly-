import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { DEMO_PASSWORD_HINT } from "@/lib/constants";
import { DemoLoginButtons } from "@/components/forms/demo-login";

export const metadata: Metadata = { title: "Explore the demo" };

export default function DemoPage() {
  return (
    <div className="container-page py-14">
      <div className="max-w-2xl">
        <p className="eyebrow">Explore the demo</p>
        <h1 className="mt-2 text-4xl font-bold">See Borrowly from every side</h1>
        <p className="mt-4 text-lg text-ink-soft">Three seeded accounts give you a customer mid-rental, a busy seller and the operations console. All people, listings and transactions are demonstration data, and every payment is simulated.</p>
      </div>
      <div className="mt-10">
        {env.demoMode ? <DemoLoginButtons /> : <p className="card p-6 text-ink-soft">One-click demo sign-in is disabled on this deployment. Use the credentials below on the <Link href="/login" className="text-forest underline">login page</Link>.</p>}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-lg font-bold">Demo credentials</h2>
          <table className="mt-3 w-full text-sm">
            <tbody className="divide-y divide-line">
              {[["Customer", "customer@borrowly.demo"], ["Seller", "seller@borrowly.demo"], ["Admin", "admin@borrowly.demo"]].map(([r, e]) => (
                <tr key={r}><td className="py-2 font-medium">{r}</td><td className="py-2 font-mono text-xs">{e}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-ink-soft">Password for all: <code className="rounded bg-canvas px-1.5 py-0.5">{DEMO_PASSWORD_HINT}</code> (development/demo only).</p>
        </div>
        <div className="card p-6 text-sm text-ink-soft">
          <h2 className="text-lg font-bold text-ink">Suggested walkthrough</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5">
            <li><strong>Customer:</strong> search “projector”, pick dates, check out with the demo payment, then open the booking.</li>
            <li><strong>Customer:</strong> confirm receipt of the Raspberry Pi order and review the completed tripod rental.</li>
            <li><strong>Seller:</strong> confirm Kavya&apos;s request, record the handover for Sneha&apos;s Canon 80D, and confirm Deepak&apos;s softbox return.</li>
            <li><strong>Seller:</strong> create a listing with your own photos and publish it.</li>
            <li><strong>Admin:</strong> approve Rahul&apos;s Outdoor Kit, resolve the open dispute and process the pending refund.</li>
          </ol>
          <p className="mt-3">The full guide is in <code>DEMO_GUIDE.md</code> in the repository.</p>
        </div>
      </div>
    </div>
  );
}
