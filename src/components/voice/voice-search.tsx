"use client";

import { useEffect, useRef, useState } from "react";
import { AudioLines, Loader2, Mic, Volume2, X } from "lucide-react";
import type { SearchIntent } from "@/modules/voice/understand";

export type VoiceSearchResult = { transcript: string; language: string | null; latencyMs: number | null; intent: SearchIntent; url: string };

const KEY = "borrowly:voice-search";

export function rememberVoiceSearch(r: VoiceSearchResult) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    // storage unavailable — the panel just won't show the transcript
  }
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const day = (iso: string) => DATE_FMT.format(new Date(`${iso}T00:00:00Z`));

/**
 * Shown on Explore after a voice search: what Gnani Prisma heard, what Borrowly understood,
 * and a spoken summary from Gnani Timbre (played automatically when the browser allows it).
 */
export function VoiceSearchPanel({ replyUrl }: { replyUrl: string }) {
  const [result, setResult] = useState<VoiceSearchResult | null>(null);
  const [hidden, setHidden] = useState(false);
  const [audioState, setAudioState] = useState<"loading" | "playing" | "ready" | "error">("loading");
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setResult(JSON.parse(raw));
    } catch {
      setResult(null);
    }
  }, []);

  const lang = result && !result.intent.tamil ? "en" : "ta";
  const src = `${replyUrl}&lang=${lang}`;

  useEffect(() => {
    if (!result) return;
    const el = new Audio(src);
    audio.current = el;
    el.oncanplaythrough = () => setAudioState((s) => (s === "loading" ? "ready" : s));
    el.onplaying = () => setAudioState("playing");
    el.onended = () => setAudioState("ready");
    el.onerror = () => setAudioState("error");
    el.play().catch(() => setAudioState((s) => (s === "error" ? s : "ready")));
    return () => {
      el.pause();
      el.src = "";
    };
  }, [result, src]);

  if (!result || hidden) return null;
  const i = result.intent;
  const chips = [
    i.itemLabel && `Item: ${i.itemLabel}`,
    !i.itemLabel && i.q && `Search: ${i.q}`,
    i.area && `Area: ${i.area}`,
    i.mode && (i.mode === "rent" ? "Rent" : "Buy"),
    i.start && i.end && `${day(i.start)} → ${day(i.end)} (${i.days} day${i.days === 1 ? "" : "s"})`,
    i.max && `Under ₹${i.max}`,
  ].filter(Boolean) as string[];

  return (
    <section className="mb-8 rounded-2xl border border-forest/20 bg-forest-50/60 p-4 sm:p-5" aria-label="Voice search">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-forest text-white"><Mic className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest">You said</p>
          <p className="mt-0.5 text-lg font-medium text-ink" lang={i.tamil ? "ta" : "en"}>“{result.transcript}”</p>
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => <span key={c} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-soft ring-1 ring-line">{c}</span>)}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
            <button
              type="button"
              onClick={() => audio.current && (audio.current.currentTime = 0, void audio.current.play())}
              disabled={audioState === "loading" || audioState === "error"}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-medium text-forest ring-1 ring-forest/20 disabled:opacity-60"
            >
              {audioState === "loading" ? <Loader2 className="size-3.5 animate-spin" /> : audioState === "playing" ? <AudioLines className="size-3.5" /> : <Volume2 className="size-3.5" />}
              {audioState === "loading" ? "Preparing reply…" : audioState === "playing" ? "Speaking…" : audioState === "error" ? "Spoken reply unavailable" : lang === "ta" ? "கேட்க / Listen" : "Listen"}
            </button>
            <span>Speech recognised by Gnani Prisma{result.language ? ` (${result.language})` : ""}{result.latencyMs ? ` in ${result.latencyMs} ms` : ""} · reply voiced by Gnani Timbre</span>
          </div>
        </div>
        <button type="button" onClick={() => setHidden(true)} className="grid size-8 place-items-center rounded-lg text-ink-faint hover:bg-white" aria-label="Dismiss"><X className="size-4" /></button>
      </div>
    </section>
  );
}
