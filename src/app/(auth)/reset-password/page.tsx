import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Choose a new password</h1>
      {token ? (
        <div className="mt-8"><ResetForm token={token} /></div>
      ) : (
        <p className="mt-4 text-ink-soft">This link is missing its token. <Link href="/forgot-password" className="text-brand underline">Request a new link</Link>.</p>
      )}
    </>
  );
}
