import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toSafeError } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { quoteRental } from "@/modules/rentals/service";

/** Server-calculated rental price. The browser never computes amounts it will be charged. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const actor = (await currentActor()) ?? { id: "anonymous", role: "CUSTOMER" as const, sellerId: null };
  try {
    const r = await quoteRental(db, actor, id, url.searchParams.get("start") ?? "", url.searchParams.get("end") ?? "", Number(url.searchParams.get("qty")) || 1);
    return NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const e = toSafeError(err);
    return NextResponse.json({ error: e.error }, { status: e.code === "INTERNAL" ? 500 : 400 });
  }
}
