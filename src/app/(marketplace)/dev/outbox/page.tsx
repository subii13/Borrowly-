import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/dates";
import { EmptyState } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Development outbox", robots: { index: false } };

/**
 * Stand-in for real email/SMS delivery. In production builds a signed-in user sees only
 * messages addressed to them; local development shows everything.
 */
export default async function OutboxPage() {
  if (!env.demoMode && env.isProd) notFound();
  const user = await getCurrentUser();
  const showAll = !env.isProd;
  const profile = user ? await db.userProfile.findUnique({ where: { userId: user.id }, select: { phone: true } }) : null;
  const seller = user?.sellerProfile ? await db.sellerProfile.findUnique({ where: { id: user.sellerProfile.id }, select: { phone: true } }) : null;
  const targets = [user?.email, profile?.phone, seller?.phone].filter(Boolean) as string[];
  const messages = showAll || targets.length ? await db.devMessage.findMany({ where: showAll ? {} : { to: { in: targets } }, orderBy: { createdAt: "desc" }, take: 50 }) : [];

  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow">Development only</p>
      <h1 className="mt-2 text-3xl font-bold">Message outbox</h1>
      <p className="mt-2 text-ink-soft">No email or SMS provider is configured, so verification links, reset links and phone codes are written here. {showAll ? "Local development: showing all messages." : "Showing messages for your account only."}</p>
      <div className="mt-8">
        {messages.length ? (
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="card p-4">
                <p className="text-xs text-ink-faint">{m.channel} · to {m.to} · {formatDateTime(m.createdAt)}</p>
                <p className="mt-1 font-semibold">{m.subject}</p>
                <p className="mt-1 break-all text-sm text-ink-soft">
                  {m.body.split(/(https?:\/\/\S+)/g).map((part, i) => (/^https?:\/\//.test(part) ? <a key={i} href={part.replace(/^https?:\/\/[^/]+/, "")} className="text-forest underline">{part}</a> : part))}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Inbox} title="No messages" body={user ? "Nothing has been sent to your account yet." : "Sign in to see messages sent to your account."} />
        )}
      </div>
    </div>
  );
}
