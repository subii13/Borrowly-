"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { AREAS, CONDITIONS, CONDITION_LABEL, SORT_OPTIONS } from "@/lib/constants";

type Cat = { slug: string; name: string };

export function Filters({ categories, lockCategory }: { categories: Cat[]; lockCategory?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);

  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const val = (k: string) => params.get(k) ?? "";
  const activeCount = ["category", "area", "condition", "mode", "min", "max"].filter((k) => params.get(k) && !(k === "category" && lockCategory)).length;

  const body = (
    <div className="space-y-6">
      <div>
        <p className="label">Rent or buy</p>
        <div className="grid grid-cols-2 gap-1.5">
          {[["", "All"], ["rent", "Rent"], ["buy", "Buy"], ["both", "Rent & buy"]].map(([v, l]) => (
            <button key={v} type="button" onClick={() => set("mode", v || null)} className={`rounded-lg border px-3 py-2 text-sm ${val("mode") === v ? "border-brand bg-brand-50 font-medium text-brand" : "border-line bg-white text-ink-soft hover:border-line-strong"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {!lockCategory && (
        <div>
          <label className="label" htmlFor="f-cat">Category</label>
          <select id="f-cat" className="input" value={val("category")} onChange={(e) => set("category", e.target.value || null)}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="label" htmlFor="f-area">Area</label>
        <select id="f-area" className="input" value={val("area")} onChange={(e) => set("area", e.target.value || null)}>
          <option value="">All of Coimbatore</option>
          {AREAS.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-cond">Condition</label>
        <select id="f-cond" className="input" value={val("condition")} onChange={(e) => set("condition", e.target.value || null)}>
          <option value="">Any condition</option>
          {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
        </select>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const next = new URLSearchParams(params.toString());
          for (const k of ["min", "max"]) {
            const v = String(f.get(k) ?? "").trim();
            if (/^\d+$/.test(v)) next.set(k, v);
            else next.delete(k);
          }
          next.delete("page");
          router.push(`${pathname}?${next.toString()}`, { scroll: false });
        }}
      >
        <p className="label">Price (₹ per day, or sale price)</p>
        <div className="flex items-center gap-2">
          <input name="min" inputMode="numeric" placeholder="Min" defaultValue={val("min")} className="input" aria-label="Minimum price" />
          <span className="text-ink-faint">–</span>
          <input name="max" inputMode="numeric" placeholder="Max" defaultValue={val("max")} className="input" aria-label="Maximum price" />
        </div>
        <button className="mt-2 w-full rounded-lg border border-line-strong bg-white py-2 text-sm font-medium hover:bg-canvas">Apply price</button>
      </form>
      {activeCount > 0 && (
        <button type="button" onClick={() => router.push(lockCategory ? pathname : `${pathname}${params.get("q") ? `?q=${encodeURIComponent(params.get("q")!)}` : ""}`)} className="text-sm font-medium text-brand hover:underline">
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-24">{body}</div>
      </aside>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-line-strong bg-white px-3.5 py-2 text-sm font-medium lg:hidden">
        <SlidersHorizontal className="size-4" aria-hidden /> Filters {activeCount > 0 && <span className="rounded-full bg-brand px-1.5 text-xs text-white">{activeCount}</span>}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-canvas p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold">Filters</h2>
              <button onClick={() => setOpen(false)} className="grid size-10 place-items-center" aria-label="Close filters"><X className="size-5" /></button>
            </div>
            {body}
            <button onClick={() => setOpen(false)} className="mt-6 h-12 w-full rounded-lg bg-brand font-medium text-white">Show results</button>
          </div>
        </div>
      )}
    </>
  );
}

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Sort results"
      className="input w-auto py-2 text-sm"
      value={params.get("sort") ?? (params.get("q") ? "relevance" : "newest")}
      onChange={(e) => {
        const next = new URLSearchParams(params.toString());
        next.set("sort", e.target.value);
        next.delete("page");
        router.push(`${pathname}?${next.toString()}`, { scroll: false });
      }}
    >
      {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
