import { headers } from "next/headers";
import { AppError } from "./errors";

// Fixed-window limiter held in process memory. Adequate for a single instance / demo;
// for multi-instance production swap the store for Redis (e.g. Upstash) — see SECURITY.md.
const buckets = new Map<string, { count: number; resetAt: number }>();

export function hit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
}

export async function rateLimit(action: string, limit: number, windowMs = 60_000, subject?: string) {
  const key = `${action}:${subject ?? (await clientIp())}`;
  if (!hit(key, limit, windowMs)) throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
}
