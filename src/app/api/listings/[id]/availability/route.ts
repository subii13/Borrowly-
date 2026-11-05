import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDay, todayIST } from "@/lib/dates";
import { availabilityCalendar } from "@/modules/rentals/availability";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await db.listing.findUnique({ where: { id }, select: { id: true, stockQuantity: true, status: true, rentalEnabled: true } });
  if (!listing || listing.status !== "ACTIVE" || !listing.rentalEnabled) return NextResponse.json({ error: "Not available" }, { status: 404 });
  const url = new URL(req.url);
  let from = todayIST();
  try {
    const f = url.searchParams.get("from");
    if (f && parseDay(f) > from) from = parseDay(f);
  } catch {
    // ignore malformed dates and fall back to today
  }
  const days = Math.min(Number(url.searchParams.get("days")) || 62, 120);
  return NextResponse.json({ stock: listing.stockQuantity, days: await availabilityCalendar(db, listing, from, days) }, { headers: { "Cache-Control": "no-store" } });
}
