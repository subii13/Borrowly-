import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storageMode } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up", storage: storageMode(), latencyMs: Date.now() - started });
  } catch {
    return NextResponse.json({ status: "degraded", database: "down" }, { status: 503 });
  }
}
