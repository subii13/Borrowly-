import { AppError } from "@/lib/errors";

/**
 * Gnani AI voice models over the Vachana API (https://docs.gnani.ai).
 *  - Prisma v3.0: speech to text  — POST /stt/v3 (multipart)
 *  - Timbre:      text to speech  — POST /api/v1/tts/inference (JSON → audio)
 * Always called from the server so the API key never reaches the browser.
 */
const BASE = "https://api.vachana.ai";
export const STT_MODEL = "prisma-v3.0";
export const TTS_MODEL = "timbre-v3.0";

export type SttFormat = "verbatim" | "transcribe" | "codemix" | "transliterate";
export type TtsLanguage = "ta-IN" | "en-IN" | "hi-IN" | "hi-en";

/** Female Timbre v3.0 voice; every v3.0 voice speaks all ten supported languages. */
export const DEFAULT_VOICE = "Lakshmi";

type Fetch = typeof fetch;
let fetchImpl: Fetch = (...args) => fetch(...args);
/** Test hook. */
export const setGnaniFetch = (f: Fetch) => (fetchImpl = f);

function apiKey() {
  const key = process.env.GNANI_API_KEY?.trim();
  if (!key) throw new AppError("UNAVAILABLE", "Voice is not configured on this server yet (GNANI_API_KEY is missing).");
  return key;
}

export const voiceConfigured = () => !!process.env.GNANI_API_KEY?.trim();

async function failure(res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  console.error(`[gnani] ${res.status} ${body.slice(0, 300)}`);
  if (res.status === 401 || res.status === 403) throw new AppError("UNAVAILABLE", "The voice service rejected our API key.");
  if (res.status === 402) throw new AppError("UNAVAILABLE", "Voice credits are used up for now.");
  if (res.status === 429) throw new AppError("RATE_LIMITED", "The voice service is busy — please try again in a moment.");
  if ((res.status === 400 || res.status === 422) && res.url.includes("/stt/")) throw new AppError("VALIDATION", "We couldn't process that recording. Try speaking for a little longer.");
  throw new AppError("UNAVAILABLE", "The voice service didn't respond. Please try again.");
}

/** The API allows one active request at a time per key: retry briefly on 429. */
async function call(url: string, init: RequestInit, attempts = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(30_000) });
    if (res.status !== 429 || i >= attempts - 1) return res;
    await new Promise((r) => setTimeout(r, 700 * (i + 1)));
  }
}

export type Transcript = { text: string; language: string | null; model: string; latencyMs: number | null };

/**
 * Prisma v3.0 speech to text. `languages` takes up to four codes (e.g. "ta-IN,en-IN") or
 * "indic-auto". `codemix` keeps Tanglish/Hinglish as spoken (English words stay English).
 */
export async function transcribe(audio: Buffer, opts: { languages?: string; format?: SttFormat; keyterms?: string[] } = {}): Promise<Transcript> {
  const form = new FormData();
  form.set("audio_file", new Blob([new Uint8Array(audio)], { type: "audio/wav" }), "recording.wav");
  form.set("model", STT_MODEL);
  form.set("language_code", opts.languages ?? "ta-IN,en-IN");
  form.set("format", opts.format ?? "codemix");
  if (opts.keyterms?.length) form.set("keyterms", opts.keyterms.slice(0, 50).join(","));
  // Content-Type is left to fetch so the multipart boundary is generated correctly.
  const res = await call(`${BASE}/stt/v3`, { method: "POST", headers: { "X-API-Key-ID": apiKey() }, body: form });
  if (!res.ok) return failure(res);
  const body = (await res.json()) as { success?: boolean; transcript?: string; detected_language_code?: string; model?: string; end_to_end_latency?: number };
  if (body.success === false) return failure(new Response(JSON.stringify(body), { status: 400 }));
  return {
    text: (body.transcript ?? "").trim(),
    language: body.detected_language_code ?? null,
    model: body.model ?? STT_MODEL,
    latencyMs: typeof body.end_to_end_latency === "number" ? Math.round(body.end_to_end_latency * 1000) : null,
  };
}

/** Timbre text to speech. Returns MP3 bytes by default (small, plays everywhere). */
export async function synthesize(text: string, opts: { language?: TtsLanguage; voice?: string; container?: "mp3" | "wav" } = {}): Promise<Buffer> {
  const res = await call(`${BASE}/api/v1/tts/inference`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key-ID": apiKey() },
    body: JSON.stringify({
      text: text.slice(0, 600),
      voice: opts.voice ?? DEFAULT_VOICE,
      model: TTS_MODEL,
      language: opts.language ?? "ta-IN",
      speed: 1.0,
      audio_config: opts.container === "wav" ? { sample_rate: 16000, num_channels: 1, sample_width: 2, encoding: "linear_pcm", container: "wav" } : { sample_rate: 24000, num_channels: 1, sample_width: 2, encoding: "linear_pcm", container: "mp3", bitrate: "64k" },
    }),
  });
  if (!res.ok) return failure(res);
  return Buffer.from(await res.arrayBuffer());
}

/** Accepts only RIFF/WAVE uploads (what our browser recorder produces). */
export function isWav(buf: Uint8Array) {
  return buf.length > 44 && String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WAVE";
}
