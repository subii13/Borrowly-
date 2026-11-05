"use client";

import Link from "next/link";

/** Generic error boundary. Never shows internal error details to the user. */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <h1 className="text-3xl font-bold">Something went wrong</h1>
      <p className="mt-3 max-w-md text-ink-soft">Please try again. If it keeps happening, the issue has been logged for the team.</p>
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="h-11 rounded-lg bg-forest px-4 font-medium text-white">Try again</button>
        <Link href="/" className="inline-flex h-11 items-center rounded-lg border border-line-strong bg-white px-4 font-medium">Home</Link>
      </div>
    </main>
  );
}
