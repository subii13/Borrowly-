import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { SafeImage } from "@/components/ui/safe-image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
        <p className="text-center text-xs text-ink-faint">
          <Link href="/terms" className="hover:text-ink">Terms</Link> · <Link href="/privacy" className="hover:text-ink">Privacy</Link> · <Link href="/demo" className="hover:text-ink">Explore the demo</Link>
        </p>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <SafeImage src="/images/categories/cameras.webp" alt="" fill priority sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/30 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <p className="font-display text-3xl font-bold leading-tight">Own less.<br />Access more.</p>
          <p className="mt-3 max-w-sm text-white/80">Rent or buy pre-owned from verified neighbours across Coimbatore.</p>
        </div>
      </div>
    </div>
  );
}
