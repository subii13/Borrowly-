import type { Metadata } from "next";
import { cookies } from "next/headers";
import { searchParamsSchema } from "@/modules/listings/search";
import { Results } from "@/components/marketplace/results";
import { SearchBar } from "@/components/marketplace/search-bar";
import { VoiceSearchPanel } from "@/components/voice/voice-search";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export const metadata: Metadata = { title: "Explore" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ExplorePage({ searchParams }: { searchParams: SP }) {
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  // The header location selector pre-filters by area unless the URL says otherwise.
  const preferred = (await cookies()).get("borrowly_area")?.value;
  if (!("area" in raw) && preferred) raw.area = preferred;
  const filters = searchParamsSchema.parse(raw);
  // Dates spoken in a voice search are carried to the product page's booking calendar.
  const dates = raw.start && raw.end && ISO_DAY.test(raw.start) && ISO_DAY.test(raw.end) ? { start: raw.start, end: raw.end } : null;
  const linkSuffix = dates ? `?start=${dates.start}&end=${dates.end}` : undefined;
  const reply = new URLSearchParams({ kind: "search" });
  for (const k of ["q", "category", "area", "mode", "max", "condition"] as const) if (filters[k] !== undefined) reply.set(k, String(filters[k]));
  if (dates) {
    reply.set("start", dates.start);
    reply.set("end", dates.end);
  }
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-bold">{filters.q ? `Results for “${filters.q}”` : "Explore Borrowly"}</h1>
        <p className="mt-1.5 text-ink-soft">Rent by the day or buy pre-owned from people across Coimbatore.</p>
        <div className="mt-5">
          <SearchBar initial={filters.q ?? ""} key={filters.q ?? ""} />
        </div>
      </div>
      {raw.voice === "1" && <VoiceSearchPanel key={reply.toString()} replyUrl={`/api/voice/reply?${reply.toString()}`} />}
      <Results filters={filters} basePath="/explore" rawParams={raw} linkSuffix={linkSuffix} />
    </div>
  );
}
