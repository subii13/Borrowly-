import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { suggestions } from "@/modules/listings/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 60) ?? "";
  return NextResponse.json({ items: await suggestions(db, q) });
}
