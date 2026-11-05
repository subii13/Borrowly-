import { Suspense } from "react";
import { SearchX } from "lucide-react";
import { db } from "@/lib/db";
import { searchListings, type SearchFilters } from "@/modules/listings/search";
import { ListingGrid } from "./listing-card";
import { Filters, SortSelect } from "./filters";
import { Pagination } from "./pagination";
import { EmptyState } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export async function Results({ filters, basePath, lockCategory, rawParams }: { filters: SearchFilters; basePath: string; lockCategory?: string; rawParams: Record<string, string | undefined> }) {
  const [result, categories] = await Promise.all([
    searchListings(db, filters),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
  ]);
  return (
    <div className="flex gap-8">
      <Suspense>
        <Filters categories={categories} lockCategory={lockCategory} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">{result.total}</span> {result.total === 1 ? "item" : "items"}
            {filters.q ? <> for “{filters.q}”</> : null}
            {filters.area ? <> in {filters.area}</> : null}
          </p>
          <Suspense>
            <SortSelect />
          </Suspense>
        </div>
        {result.items.length ? (
          <ListingGrid listings={result.items} />
        ) : (
          <EmptyState icon={SearchX} title="Nothing matches yet" body="Try a broader search, another area, or clear a filter. New items are listed every day." action={<ButtonLink href={basePath} variant="secondary" size="sm">Clear filters</ButtonLink>} />
        )}
        <Pagination page={result.page} pages={result.pages} params={rawParams} basePath={basePath} />
      </div>
    </div>
  );
}
