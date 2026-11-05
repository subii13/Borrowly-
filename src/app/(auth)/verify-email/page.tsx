import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { verifyEmail } from "@/modules/auth/service";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    try {
      await verifyEmail(db, token);
      ok = true;
    } catch {
      ok = false;
    }
  }
  return (
    <div className="text-center">
      {ok ? <CheckCircle2 className="mx-auto size-12 text-forest" /> : <XCircle className="mx-auto size-12 text-rose" />}
      <h1 className="mt-4 text-2xl font-bold">{ok ? "Email verified" : "Link invalid or expired"}</h1>
      <p className="mt-2 text-ink-soft">{ok ? "Thanks — your email address is confirmed." : "Request a new verification email from your account page."}</p>
      <ButtonLink href="/account" className="mt-6">Go to my account</ButtonLink>
    </div>
  );
}
