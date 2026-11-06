"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { clsx } from "clsx";
import { Search } from "lucide-react";
import { MicButton } from "@/components/voice/mic-button";
import { rememberVoiceSearch, type VoiceSearchResult } from "@/components/voice/voice-search";

type Suggestion = { id: string; title: string; category: string };

export function SearchBar({ initial = "", size = "md", autoFocus }: { initial?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setItems([]);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setItems(d.items ?? []))
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const submit = (term = q) => {
    setOpen(false);
    router.push(term.trim() ? `/explore?q=${encodeURIComponent(term.trim())}` : "/explore");
  };

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        if (active >= 0 && items[active]) router.push(`/listings/${items[active].id}`);
        else submit();
      }}
    >
      <div className={clsx("flex items-center gap-2 rounded-xl border border-line-strong bg-white shadow-[var(--shadow-card)] focus-within:border-forest focus-within:ring-2 focus-within:ring-forest/15", size === "lg" ? "p-1.5 pl-4" : "p-1 pl-3")}>
        <Search className="size-5 shrink-0 text-ink-faint" aria-hidden />
        <input
          type="search"
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, items.length - 1));
            if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, -1));
          }}
          placeholder="Search cameras, projectors, tools…"
          aria-label="Search Borrowly"
          aria-autocomplete="list"
          aria-controls={listId}
          className={clsx("min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink-faint focus:outline-none", size === "lg" ? "py-2.5 text-base" : "py-1.5 text-[15px]")}
        />
        <MicButton<VoiceSearchResult>
          purpose="search"
          label="Search by voice"
          onResult={(r) => {
            rememberVoiceSearch(r);
            setQ(r.intent.q ?? "");
            router.push(r.url);
          }}
        />
        <button type="submit" className={clsx("shrink-0 rounded-lg bg-forest font-medium text-white hover:bg-forest-dark", size === "lg" ? "px-5 py-3" : "px-4 py-2 text-sm")}>
          Search
        </button>
      </div>
      {open && items.length > 0 && (
        <ul id={listId} role="listbox" className="card absolute inset-x-0 top-full z-30 mt-2 overflow-hidden p-1 shadow-[var(--shadow-lift)]">
          {items.map((s, i) => (
            <li key={s.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => router.push(`/listings/${s.id}`)}
                className={clsx("flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm", i === active ? "bg-forest-50" : "hover:bg-canvas")}
              >
                <span className="truncate text-ink">{s.title}</span>
                <span className="shrink-0 text-xs text-ink-faint">{s.category}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => submit()} className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-forest hover:bg-canvas">
              See all results for “{q.trim()}”
            </button>
          </li>
        </ul>
      )}
    </form>
  );
}
