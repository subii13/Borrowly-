"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Loader2, MapPin, Mic, Square } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { useVoiceCapture } from "@/components/voice/use-voice-capture";
import { rememberVoiceSearch, type VoiceSearchResult } from "@/components/voice/voice-search";
import { voiceActivity, type VoiceMode } from "@/components/voice/activity";

const OrbScene = dynamic(() => import("./orb-scene"), { ssr: false, loading: () => <CssOrb mode="idle" /> });

export type FloatingListing = { id: string; title: string; area: string; price: string; image: string };

const PHRASES = ["“Naalaiku oru DSLR camera venum, RS Puram la”", "“நாளைக்கு ஒரு projector வேண்டும்”", "“Need a drill in Gandhipuram this weekend”"];

/** CSS stand-in for the WebGL orb (loading state, no WebGL, or reduced motion). */
function CssOrb({ mode }: { mode: VoiceMode }) {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden>
      <div
        className={clsx(
          "aspect-square w-[62%] rounded-full transition-transform duration-500",
          "bg-[radial-gradient(circle_at_32%_28%,#b9f0d2_0%,#4f9c78_28%,#245c46_58%,#0f2e22_100%)]",
          "shadow-[0_30px_80px_-20px_rgba(36,92,70,0.55),inset_0_-20px_60px_rgba(0,0,0,0.25)]",
          mode === "listening" && "scale-105 animate-pulse",
          mode === "thinking" && "animate-spin [animation-duration:3s]",
          mode === "speaking" && "animate-pulse",
        )}
      />
    </div>
  );
}

function useCanRender3D() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let webgl = false;
    try {
      const c = document.createElement("canvas");
      webgl = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      webgl = false;
    }
    setOk(webgl && !reduced);
  }, []);
  return ok;
}

export function HeroVoice({ listings }: { listings: FloatingListing[] }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const can3D = useCanRender3D();
  const [visible, setVisible] = useState(true);
  const [lite, setLite] = useState(false);
  const [mode, setMode] = useState<VoiceMode>(voiceActivity.mode);
  const [phrase, setPhrase] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const capture = useVoiceCapture<VoiceSearchResult>({
    purpose: "search",
    onResult: (r) => {
      rememberVoiceSearch(r);
      router.push(r.url);
    },
  });

  useEffect(() => voiceActivity.subscribe(setMode), []);
  useEffect(() => {
    setLite(window.matchMedia("(max-width: 768px), (pointer: coarse)").matches);
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (capture.state !== "idle") return;
    const t = setInterval(() => setPhrase((p) => (p + 1) % PHRASES.length), 3800);
    return () => clearInterval(t);
  }, [capture.state]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 });
  };

  const recording = capture.state === "recording";
  const processing = capture.state === "processing";
  const caption = recording
    ? `Listening… ${capture.seconds}s — tap to stop`
    : processing
      ? "Understanding you with Gnani Prisma…"
      : mode === "speaking"
        ? "Replying in Tamil with Gnani Timbre…"
        : "Tap the orb and speak — Tamil, Tanglish or English";

  return (
    <div ref={box} onPointerMove={onPointerMove} onPointerLeave={() => setTilt({ x: 0, y: 0 })} className="relative mx-auto aspect-square w-full max-w-[540px] select-none">
      {/* Soft ground glow and rings give the orb a sense of depth. */}
      <div className="absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(127,207,159,0.35)_0%,rgba(127,207,159,0)_70%)] blur-2xl" aria-hidden />
      <div className="absolute inset-[4%] rounded-full border border-forest/10" aria-hidden />
      <div className="absolute inset-[14%] rounded-full border border-dashed border-forest/15 [animation:spin_60s_linear_infinite]" aria-hidden />

      <div className="absolute inset-0" style={{ transform: `translate3d(${tilt.x * -14}px, ${tilt.y * -14}px, 0)`, transition: "transform 300ms ease-out" }}>
        {can3D ? <OrbScene active={visible} lite={lite} /> : <CssOrb mode={mode} />}
      </div>

      <button
        type="button"
        onClick={capture.toggle}
        disabled={processing}
        aria-label={recording ? "Stop recording" : "Search by voice"}
        aria-pressed={recording}
        data-testid="orb-mic"
        className="absolute left-1/2 top-1/2 grid size-[46%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-offset-8 focus-visible:outline-2 focus-visible:outline-forest"
      >
        <span
          className={clsx(
            "grid size-16 place-items-center rounded-full backdrop-blur-md transition-all duration-300",
            recording ? "scale-110 bg-rose/90 text-white shadow-[0_0_0_10px_rgba(166,58,43,0.18)]" : "bg-white/15 text-white ring-1 ring-white/40 hover:scale-105 hover:bg-white/25",
          )}
        >
          {processing ? <Loader2 className="size-7 animate-spin" /> : recording ? <Square className="size-6 fill-current" /> : <Mic className="size-7" />}
        </span>
      </button>

      {/* Floating listings at different depths. */}
      {listings.slice(0, 2).map((l, i) => (
        <Link
          key={l.id}
          href={`/listings/${l.id}`}
          className={clsx(
            "absolute z-10 hidden w-48 items-center gap-2.5 rounded-2xl border border-white/60 bg-white/75 p-2 pr-3 shadow-[0_18px_40px_-18px_rgba(32,36,31,0.45)] backdrop-blur-md transition-shadow hover:shadow-[0_24px_50px_-18px_rgba(32,36,31,0.55)] sm:flex",
            i === 0 ? "left-0 top-[10%] [animation:float_7s_ease-in-out_infinite]" : "bottom-[12%] right-0 [animation:float_8s_ease-in-out_-3s_infinite]",
          )}
          style={{ translate: `${tilt.x * (i ? 26 : 18)}px ${tilt.y * (i ? 26 : 18)}px` }}
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
            <SafeImage src={l.image} alt="" fill sizes="48px" className="object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-ink">{l.title}</span>
            <span className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-soft"><MapPin className="size-3" />{l.area}</span>
            <span className="block text-xs font-semibold text-forest">{l.price}</span>
          </span>
        </Link>
      ))}

      <div className="absolute inset-x-0 bottom-0 text-center" aria-live="polite">
        <p className={clsx("inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium shadow-sm ring-1 backdrop-blur", recording ? "bg-rose text-white ring-rose" : "bg-white/85 text-ink ring-line")}>
          {recording && <span className="size-2 animate-pulse rounded-full bg-white" />}
          {caption}
        </p>
        {capture.state === "idle" && mode !== "speaking" && (
          <p key={phrase} className="mt-2 text-xs text-ink-soft [animation:fade-in_600ms_ease-out]" lang="ta">
            Try {PHRASES[phrase]}
          </p>
        )}
      </div>
    </div>
  );
}
