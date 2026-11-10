import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, params, basePath }: { page: number; pages: number; params: Record<string, string | undefined>; basePath: string }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    if (p > 1) q.set("page", String(p));
    else q.delete("page");
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const cls = "inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm";
  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5" aria-label="Pagination">
      {page > 1 && <Link href={href(page - 1)} className={`${cls} border-line bg-white`} aria-label="Previous page"><ChevronLeft className="size-4" /></Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={href(p)} aria-current={p === page ? "page" : undefined} className={`${cls} ${p === page ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-line-strong"}`}>{p}</Link>
      ))}
      {page < pages && <Link href={href(page + 1)} className={`${cls} border-line bg-white`} aria-label="Next page"><ChevronRight className="size-4" /></Link>}
    </nav>
  );
}
