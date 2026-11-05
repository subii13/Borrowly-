import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-3xl font-bold">Reset your password</h1>
      <p className="mt-2 text-ink-soft">Enter your email and we&apos;ll send you a reset link. In this demo, emails appear in the <Link href="/dev/outbox" className="text-forest underline">development outbox</Link>.</p>
      <div className="mt-8"><ForgotForm /></div>
      <p className="mt-6 text-sm"><Link href="/login" className="font-medium text-forest hover:underline">Back to log in</Link></p>
    </>
  );
}
