import type { Metadata } from "next";
import Link from "next/link";
import { env } from "@/lib/env";
import { LoginForm } from "@/components/forms/auth-forms";
import { DemoLoginButtons } from "@/components/forms/demo-login";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="text-3xl font-bold">Welcome back</h1>
      <p className="mt-2 text-ink-soft">Log in to manage your rentals, orders and listings.</p>
      <div className="mt-8"><LoginForm next={next} /></div>
      <p className="mt-6 text-sm text-ink-soft">New to Borrowly? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-brand hover:underline">Create an account</Link></p>
      {env.demoMode && (
        <div className="mt-8 border-t border-line pt-6">
          <p className="text-sm font-semibold">Evaluating Borrowly?</p>
          <p className="mt-1 text-xs text-ink-soft">Sign in instantly as a demo user. Demo accounts contain sample data only.</p>
          <div className="mt-3"><DemoLoginButtons compact /></div>
        </div>
      )}
    </>
  );
}
