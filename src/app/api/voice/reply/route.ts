import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, toSafeError } from "@/lib/errors";
import { daysBetween, parseDay } from "@/lib/dates";
import { partyOf } from "@/lib/permissions";
import { currentActor } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { searchListings, searchParamsSchema } from "@/modules/listings/search";
import { synthesize } from "@/modules/voice/gnani";
import { AREA_ALIASES, ITEMS } from "@/modules/voice/lexicon";
import { bookingReply, searchReply } from "@/modules/voice/reply";

// Small in-memory cache so repeated replies don't spend credits twice.
const cache = new Map<string, Buffer>();
const remember = (key: string, audio: Buffer) => {
  if (cache.size >= 100) cache.delete(cache.keys().next().value!);
  cache.set(key, audio);
};

/**
 * Spoken reply via Gnani Timbre. The text is always composed on the server from database
 * results (never taken from the client), so the endpoint can't be used as a free TTS service.
 *   ?kind=search&q=…&area=…&mode=…&max=…&start=…&end=…&lang=ta|en
 *   ?kind=booking&id=…   (transaction parties only)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const actor = await currentActor();
    await rateLimit("voice-tts", 15, 60_000, actor?.id ?? (await clientIp()));
    const kind = url.searchParams.get("kind");
    let text: string;
    let language: "ta-IN" | "en-IN" = "ta-IN";

    if (kind === "search") {
      const tamil = url.searchParams.get("lang") !== "en";
      language = tamil ? "ta-IN" : "en-IN";
      const filters = searchParamsSchema.parse(Object.fromEntries(url.searchParams));
      const result = await searchListings(db, { ...filters, page: 1 });
      const first = result.items[0];
      const elsewhere = !result.total && filters.area ? (await searchListings(db, { ...filters, area: undefined, page: 1 })).total : undefined;
      const area = AREA_ALIASES.find((a) => a.area === filters.area);
      let dates: { start: string; end: string; days: number } | undefined;
      try {
        const start = url.searchParams.get("start");
        const end = url.searchParams.get("end");
        if (start && end) dates = { start, end, days: daysBetween(parseDay(start), parseDay(end)) };
      } catch {
        dates = undefined;
      }
      text = searchReply({
        tamil,
        total: result.total,
        itemLabel: ITEMS.find((i) => i.query === filters.q)?.label,
        query: filters.q,
        area: filters.area,
        areaTa: area?.ta,
        dates,
        elsewhere,
        first: first && { title: first.title, dailyRatePaise: first.dailyRatePaise, salePricePaise: first.salePricePaise, rentalEnabled: first.rentalEnabled },
      });
    } else if (kind === "booking") {
      const b = await db.rentalBooking.findUnique({ where: { id: url.searchParams.get("id") ?? "" }, include: { listing: { select: { title: true } } } });
      if (!actor || !b || !partyOf(actor, b)) throw new AppError("NOT_FOUND", "Not found");
      text = bookingReply({ title: b.listing.title, status: b.status, days: b.days, totalPaise: b.totalPaise });
    } else {
      throw new AppError("VALIDATION", "Unknown reply type");
    }

    const key = createHash("sha256").update(`${language}:${text}`).digest("hex");
    let audio = cache.get(key);
    if (!audio) {
      audio = await synthesize(text, { language });
      remember(key, audio);
    }
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=300", "X-Reply-Text": encodeURIComponent(text) },
    });
  } catch (err) {
    const e = toSafeError(err);
    const status = { UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, RATE_LIMITED: 429, UNAVAILABLE: 503, INTERNAL: 500 }[e.code as string] ?? 400;
    return NextResponse.json({ error: e.error }, { status });
  }
}
