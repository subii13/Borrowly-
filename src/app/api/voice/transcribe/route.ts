import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { AppError, toSafeError } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { todayIST } from "@/lib/dates";
import { isWav, transcribe } from "@/modules/voice/gnani";
import { exploreUrl, parseListingDraft, parseSearchIntent } from "@/modules/voice/understand";
import { AREA_ALIASES, ITEMS } from "@/modules/voice/lexicon";

const MAX_BYTES = 3 * 1024 * 1024; // ~90 s of 16 kHz mono WAV; Prisma REST accepts up to 30 s
const PURPOSES = ["search", "listing", "note"] as const;
type Purpose = (typeof PURPOSES)[number];

// Context words that help Prisma recognise marketplace vocabulary and Coimbatore place names.
const KEYTERMS = [...new Set([...ITEMS.map((i) => i.label), ...AREA_ALIASES.map((a) => a.area), "Borrowly", "Coimbatore"])];

/**
 * Voice input: a WAV recording → Gnani Prisma v3.0 transcript → structured result.
 *   search  → filters + explore URL (anyone, rate-limited)
 *   listing → listing draft for the seller wizard (sellers only)
 *   note    → transcript for handover/return evidence (signed-in users)
 */
export async function POST(req: Request) {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && new URL(origin).host !== h.get("host")) throw new AppError("FORBIDDEN", "Cross-site request rejected");
    const form = await req.formData();
    const purpose = String(form.get("purpose")) as Purpose;
    if (!PURPOSES.includes(purpose)) throw new AppError("VALIDATION", "Unknown voice request");

    const actor = await currentActor();
    if (purpose !== "search" && !actor) throw new AppError("UNAUTHENTICATED", "Please sign in to use voice here");
    if (purpose === "listing" && !actor?.sellerId) throw new AppError("FORBIDDEN", "Create a seller profile first");
    await rateLimit("voice-stt", actor ? 20 : 8, 60_000, actor?.id ?? (await clientIp()));

    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "No recording received");
    if (file.size > MAX_BYTES) throw new AppError("VALIDATION", "That recording is too long — keep it under 25 seconds");
    const audio = Buffer.from(await file.arrayBuffer());
    if (!isWav(audio)) throw new AppError("VALIDATION", "Unsupported audio format");

    const t = await transcribe(audio, { languages: "ta-IN,en-IN", format: "codemix", keyterms: KEYTERMS });
    if (!t.text) throw new AppError("VALIDATION", "We didn't catch that — please try again a little closer to the mic.");

    const meta = { transcript: t.text, language: t.language, model: t.model, latencyMs: t.latencyMs };
    if (purpose === "search") {
      const intent = parseSearchIntent(t.text, todayIST(), t.language);
      return NextResponse.json({ ...meta, intent, url: exploreUrl(intent) });
    }
    if (purpose === "listing") return NextResponse.json({ ...meta, draft: parseListingDraft(t.text) });
    return NextResponse.json(meta);
  } catch (err) {
    const e = toSafeError(err);
    const status = { UNAUTHENTICATED: 401, FORBIDDEN: 403, RATE_LIMITED: 429, UNAVAILABLE: 503, INTERNAL: 500 }[e.code as string] ?? 400;
    return NextResponse.json({ error: e.error }, { status });
  }
}
