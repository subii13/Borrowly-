import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Supabase's transaction pooler (PgBouncer, port 6543) does not support prepared statements.
 * Prisma must be told via `pgbouncer=true`, and serverless functions should hold few connections.
 * Add those parameters automatically if the configured URL is missing them.
 */
export function withPoolerParams(raw: string | undefined): string | undefined {
  if (!raw) return raw;
  try {
    const url = new URL(raw.trim());
    if (url.port !== "6543" && !url.hostname.includes("pooler.")) return raw.trim();
    if (url.port !== "6543") return raw.trim(); // session pooler supports prepared statements
    if (!url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "3");
    return url.toString();
  } catch {
    return raw;
  }
}

const datasourceUrl = withPoolerParams(process.env.DATABASE_URL);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export type Db = typeof db;
/** Interactive transaction client. */
export type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0];
export type DbOrTx = Db | Tx;
