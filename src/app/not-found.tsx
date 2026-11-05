import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-4xl font-bold">We couldn&apos;t find that</h1>
        <p className="mt-3 max-w-md text-ink-soft">The page may have moved, or the item is no longer listed.</p>
        <div className="mt-8 flex gap-3">
          <ButtonLink href="/explore">Explore listings</ButtonLink>
          <ButtonLink href="/" variant="secondary">Home</ButtonLink>
        </div>
      </main>
    </>
  );
}
