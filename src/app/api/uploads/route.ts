import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { AppError, toSafeError } from "@/lib/errors";
import { currentActor } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_UPLOAD_BYTES, storeImage } from "@/lib/storage";

const SCOPES = ["listings", "evidence", "disputes"] as const;
type Scope = (typeof SCOPES)[number];

/** Authenticated image upload. Validates origin, size and real file type, then re-encodes. */
export async function POST(req: Request) {
  try {
    const h = await headers();
    const origin = h.get("origin");
    if (origin && new URL(origin).host !== h.get("host")) throw new AppError("FORBIDDEN", "Cross-site upload rejected");
    const actor = await currentActor();
    if (!actor) throw new AppError("UNAUTHENTICATED", "Please sign in");
    await rateLimit("upload", 30, 60_000, actor.id);
    const form = await req.formData();
    const scope = String(form.get("scope"));
    if (!SCOPES.includes(scope as Scope)) throw new AppError("VALIDATION", "Invalid upload scope");
    if (scope === "listings" && !actor.sellerId) throw new AppError("FORBIDDEN", "Create a seller profile first");
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "No file received");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Images must be 5 MB or smaller");
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), scope as Scope, actor.id);
    return NextResponse.json(stored);
  } catch (err) {
    const e = toSafeError(err);
    const status = e.code === "UNAUTHENTICATED" ? 401 : e.code === "FORBIDDEN" ? 403 : e.code === "RATE_LIMITED" ? 429 : e.code === "INTERNAL" ? 500 : 400;
    return NextResponse.json({ error: e.error }, { status });
  }
}
