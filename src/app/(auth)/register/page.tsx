import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/forms/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Create your account</h1>
      <p className="mt-2 text-ink-soft">One account to rent, buy and list your own items.</p>
      <div className="mt-8"><RegisterForm next={next} /></div>
      <p className="mt-6 text-sm text-ink-soft">Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Log in</Link></p>
    </>
  );
}
