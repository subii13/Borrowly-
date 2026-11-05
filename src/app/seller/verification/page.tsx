import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { db } from "@/lib/db";
import { requireSellerPage } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { VERIFICATION_LABEL } from "@/lib/constants";
import { requestOtpAction, submitVerificationAction, verifyOtpAction } from "@/app/actions/seller";
import { resendVerificationAction } from "@/app/actions/auth";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Verification status" };

export default async function VerificationPage() {
  const { user, actor } = await requireSellerPage();
  const s = await db.sellerProfile.findUniqueOrThrow({ where: { id: actor.sellerId } });
  const steps = [
    { done: !!user.emailVerifiedAt, label: "Verify your email address", action: !user.emailVerifiedAt && <ActionButton variant="secondary" action={resendVerificationAction}>Send verification email</ActionButton> },
    {
      done: !!s.phoneVerifiedAt,
      label: s.phone ? `Verify your phone (${s.phone})` : "Add a phone number to your seller profile",
      action: !s.phoneVerifiedAt && (s.phone ? (
        <div className="flex flex-wrap gap-2">
          <ActionButton variant="secondary" action={requestOtpAction}>Send code</ActionButton>
          <ActionButton action={verifyOtpAction} prompt={{ label: "Enter the 6-digit code", required: true, placeholder: "123456" }}>Enter code</ActionButton>
        </div>
      ) : <Link href="/seller/profile" className="text-sm font-medium text-forest underline">Add phone</Link>),
    },
    {
      done: ["PENDING", "VERIFIED"].includes(s.verificationStatus),
      label: "Submit your profile for review",
      action: ["NOT_SUBMITTED", "REJECTED"].includes(s.verificationStatus) && user.emailVerifiedAt && s.phoneVerifiedAt && (
        <ActionButton action={submitVerificationAction} prompt={{ label: "Anything the reviewer should know? (optional)", placeholder: "e.g. I run a camera rental shop on DB Road" }}>Submit for review</ActionButton>
      ),
    },
  ];
  return (
    <div className="max-w-3xl">
      <PageHeader title="Verification status" description="Verified sellers get a badge on every listing and rank higher in trust." />
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Current status</p>
          <Badge tone={s.verificationStatus === "VERIFIED" ? "green" : s.verificationStatus === "PENDING" ? "amber" : ["REJECTED", "SUSPENDED"].includes(s.verificationStatus) ? "rose" : "neutral"}>{VERIFICATION_LABEL[s.verificationStatus]}</Badge>
        </div>
        {s.reviewNote && <p className="mt-3 rounded-lg bg-canvas p-3 text-sm text-ink-soft">Reviewer note: {s.reviewNote}</p>}
        {s.verificationSubmittedAt && <p className="mt-2 text-xs text-ink-faint">Submitted {formatDateTime(s.verificationSubmittedAt)}{s.verifiedAt && ` · verified ${formatDateTime(s.verifiedAt)}`}</p>}
        <ol className="mt-6 space-y-4">
          {steps.map((st) => (
            <li key={st.label} className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2 text-sm">{st.done ? <CheckCircle2 className="size-5 text-forest" /> : <Circle className="size-5 text-line-strong" />}{st.label}</span>
              {st.action}
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-6 rounded-xl border border-line bg-white p-5 text-sm text-ink-soft">
        <p className="font-semibold text-ink">What verification means</p>
        <p className="mt-1">Borrowly confirms your email and phone number and a team member reviews your profile and listings. We deliberately do not collect Aadhaar or other identity documents in this version. In this demo, emails and SMS codes are delivered to the <Link href="/dev/outbox" className="text-forest underline">development outbox</Link> instead of a real provider.</p>
      </div>
    </div>
  );
}
