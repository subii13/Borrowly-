import { Search } from "lucide-react";

/** Plain GET form so admin filters work without client JS. */
export function AdminSearch({ placeholder, defaultValue, extra }: { placeholder: string; defaultValue?: string; extra?: React.ReactNode }) {
  return (
    <form className="mb-4 flex flex-wrap gap-2" role="search">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
        <input name="q" defaultValue={defaultValue} placeholder={placeholder} className="input pl-9" aria-label={placeholder} />
      </div>
      {extra}
      <button className="rounded-lg border border-line-strong bg-white px-4 text-sm font-medium hover:bg-canvas">Filter</button>
    </form>
  );
}
