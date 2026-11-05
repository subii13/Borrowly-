import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { reviewSellerAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/action-button";
import { EmptyState, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Seller verification" };

export default async function VerificationQueue() {
  const pending = await db.sellerProfile.findMany({
    where: { verificationStatus: "PENDING" },
    include: { user: { select: { name: true, email: true, emailVerifiedAt: true, createdAt: true } }, _count: { select: { listings: true } } },
    orderBy: { verificationSubmittedAt: "asc" },
  });
  return (
    <>
      <PageHeader title="Seller verification" description="Approve sellers whose email and phone are confirmed and whose profile and listings look genuine. No identity documents are collected." />
      {pending.length ? (
        <ul className="space-y-4">
          {pending.map((s) => (
            <li key={s.id} className="card p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link href={`/sellers/${s.id}`} className="text-lg font-semibold hover:text-forest">{s.displayName}</Link>
                  <p className="text-sm text-ink-soft">{s.user.name} · {s.user.email} · {s.sellerType.toLowerCase()} · {s.area}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    <li>Email verified: <strong>{s.user.emailVerifiedAt ? "yes" : "no"}</strong></li>
                    <li>Phone verified: <strong>{s.phoneVerifiedAt ? `yes (${s.phone})` : "no"}</strong></li>
                    <li>Listings: <strong>{s._count.listings}</strong></li>
                    <li>Submitted: {s.verificationSubmittedAt && formatDateTime(s.verificationSubmittedAt)}</li>
                  </ul>
                  {s.verificationNote && <p className="mt-3 rounded-lg bg-canvas p-3 text-sm">“{s.verificationNote}”</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <ActionButton action={reviewSellerAction.bind(null, s.id, "VERIFIED")} prompt={{ label: "Approval note (optional, shared with the seller)" }}>Approve</ActionButton>
                  <ActionButton variant="secondary" action={reviewSellerAction.bind(null, s.id, "REJECTED")} prompt={{ label: "Why is this not approved? (shared with the seller)", required: true }}>Reject</ActionButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={BadgeCheck} title="Queue is clear" body="No sellers are waiting for verification." />
      )}
    </>
  );
}
