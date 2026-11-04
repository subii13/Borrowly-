import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { DbOrTx } from "@/lib/db";
import { AREA_NAMES, CONDITIONS } from "@/lib/constants";

export const searchParamsSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  category: z.string().max(60).optional().catch(undefined),
  area: z.enum(AREA_NAMES).optional().catch(undefined),
  condition: z.enum(CONDITIONS).optional().catch(undefined),
  mode: z.enum(["rent", "buy", "both"]).optional().catch(undefined),
  min: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  max: z.coerce.number().int().min(0).max(10_000_000).optional().catch(undefined),
  sort: z.enum(["relevance", "newest", "price_asc", "price_desc"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(500).optional().catch(undefined),
});

export type SearchFilters = z.infer<typeof searchParamsSchema>;
export const PAGE_SIZE = 12;

/**
 * Marketplace search. Builds a parameterised SQL query (Prisma.sql escapes every value)
 * combining PostgreSQL full-text ranking with a prefix/substring fallback for short terms.
 * "Price" means the daily rate for rentable items, otherwise the selling price (rupees).
 */
export async function searchListings(db: DbOrTx, filters: SearchFilters) {
  const where: Prisma.Sql[] = [Prisma.sql`l.status = 'ACTIVE'`];
  const q = filters.q?.trim();
  const tsv = Prisma.sql`to_tsvector('english', l.title || ' ' || coalesce(l.brand,'') || ' ' || coalesce(l.model,'') || ' ' || l.description || ' ' || c.name)`;
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    where.push(Prisma.sql`(${tsv} @@ websearch_to_tsquery('english', ${q}) OR l.title ILIKE ${like} OR l.brand ILIKE ${like} OR c.name ILIKE ${like})`);
  }
  if (filters.category) where.push(Prisma.sql`c.slug = ${filters.category}`);
  if (filters.area) where.push(Prisma.sql`l.area = ${filters.area}`);
  if (filters.condition) where.push(Prisma.sql`l.condition = ${filters.condition}::"ItemCondition"`);
  if (filters.mode === "rent") where.push(Prisma.sql`l."rentalEnabled" = true`);
  if (filters.mode === "buy") where.push(Prisma.sql`l."purchaseEnabled" = true`);
  if (filters.mode === "both") where.push(Prisma.sql`l."rentalEnabled" = true AND l."purchaseEnabled" = true`);
  const price = Prisma.sql`COALESCE(CASE WHEN l."rentalEnabled" THEN l."dailyRatePaise" END, l."salePricePaise")`;
  if (filters.min !== undefined) where.push(Prisma.sql`${price} >= ${filters.min * 100}`);
  if (filters.max !== undefined) where.push(Prisma.sql`${price} <= ${filters.max * 100}`);

  const sort = filters.sort ?? (q ? "relevance" : "newest");
  const rank = q
    ? Prisma.sql`ts_rank(${tsv}, websearch_to_tsquery('english', ${q})) + CASE WHEN l.title ILIKE ${`%${q}%`} THEN 1 ELSE 0 END`
    : Prisma.sql`0`;
  const order =
    sort === "price_asc" ? Prisma.sql`${price} ASC, l."createdAt" DESC`
    : sort === "price_desc" ? Prisma.sql`${price} DESC, l."createdAt" DESC`
    : sort === "relevance" ? Prisma.sql`${rank} DESC, l."ratingCount" DESC, l."createdAt" DESC`
    : Prisma.sql`l."createdAt" DESC`;

  const page = filters.page ?? 1;
  const whereSql = Prisma.join(where, " AND ");
  const [rows, countRows] = await Promise.all([
    db.$queryRaw<{ id: string }[]>`
      SELECT l.id FROM "Listing" l JOIN "Category" c ON c.id = l."categoryId"
      WHERE ${whereSql} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    db.$queryRaw<{ count: bigint }[]>`SELECT count(*)::bigint AS count FROM "Listing" l JOIN "Category" c ON c.id = l."categoryId" WHERE ${whereSql}`,
  ]);
  const ids = rows.map((r) => r.id);
  const listings = await db.listing.findMany({ where: { id: { in: ids } }, include: cardInclude });
  const byId = new Map(listings.map((l) => [l.id, l]));
  const total = Number(countRows[0]?.count ?? 0);
  return { items: ids.map((id) => byId.get(id)!).filter(Boolean), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)), sort };
}

export const cardInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 1 },
  seller: { select: { id: true, displayName: true, verificationStatus: true } },
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ListingInclude;

export type ListingCardData = Prisma.ListingGetPayload<{ include: typeof cardInclude }>;

export async function suggestions(db: DbOrTx, q: string) {
  const term = q.trim();
  if (term.length < 2) return [];
  const rows = await db.listing.findMany({
    where: { status: "ACTIVE", OR: [{ title: { contains: term, mode: "insensitive" } }, { brand: { contains: term, mode: "insensitive" } }] },
    select: { id: true, title: true, category: { select: { name: true } } },
    take: 6,
    orderBy: { ratingCount: "desc" },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, category: r.category.name }));
}
