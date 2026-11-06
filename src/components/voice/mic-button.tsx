"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { WavRecorder } from "./recorder";

type State = "idle" | "recording" | "processing";

/**
 * Records speech, sends it to /api/voice/transcribe (Gnani Prisma on the server) and hands the
 * JSON result back. Tap to start; it stops by itself after a pause, or tap again to stop.
 */
export function MicButton<T>({
  purpose,
  onResult,
  label = "Speak",
  variant = "icon",
  maxSeconds = 20,
  className,
}: {
  purpose: "search" | "listing" | "note";
  onResult: (data: T) => void;
  label?: string;
  variant?: "icon" | "pill";
  maxSeconds?: number;
  className?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<WavRecorder | null>(null);
  const stopping = useRef(false);

  useEffect(() => {
    if (state !== "recording") return;
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(t);
  }, [state]);

  useEffect(() => () => recorder.current?.cancel(), []);

  const finish = async () => {
    if (!recorder.current || stopping.current) return;
    stopping.current = true;
    setState("processing");
    try {
      const rec = await recorder.current.stop();
      recorder.current = null;
      if (rec.seconds < 0.5) {
        toast.message("Hold on — that was too short. Tap the mic and speak.");
        return;
      }
      const body = new FormData();
      body.set("audio", rec.blob, "speech.wav");
      body.set("purpose", purpose);
      const res = await fetch("/api/voice/transcribe", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Voice request failed");
        return;
      }
      onResult(data as T);
    } catch {
      toast.error("Something went wrong with the recording. Please try again.");
    } finally {
      stopping.current = false;
      setState("idle");
      setLevel(0);
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Your browser doesn't support microphone input.");
      return;
    }
    try {
      recorder.current = new WavRecorder({ maxSeconds, onLevel: setLevel, onAutoStop: () => void finish() });
      await recorder.current.start();
      setSeconds(0);
      setState("recording");
    } catch {
      recorder.current = null;
      toast.error("Microphone access was blocked. Allow it in your browser to use voice.");
    }
  };

  const onClick = () => (state === "idle" ? start() : state === "recording" ? finish() : undefined);
  const recording = state === "recording";
  const ariaLabel = recording ? "Stop recording" : state === "processing" ? "Transcribing" : label;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={state === "processing"}
        aria-label={ariaLabel}
        aria-pressed={recording}
        data-testid={`mic-${purpose}`}
        className={clsx(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
          recording ? "border-rose bg-rose text-white" : "border-forest/30 bg-forest-50 text-forest hover:bg-forest-100",
          className,
        )}
      >
        {state === "processing" ? <Loader2 className="size-4 animate-spin" /> : recording ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
        {state === "processing" ? "Understanding…" : recording ? `Listening… ${seconds}s` : label}
        {recording && <span className="ml-1 h-2 w-10 overflow-hidden rounded-full bg-white/30"><span className="block h-full bg-white transition-[width]" style={{ width: `${Math.round(level * 100)}%` }} /></span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "processing"}
      aria-label={ariaLabel}
      aria-pressed={recording}
      title={recording ? "Tap to stop" : "Search by voice — Tamil, Tanglish or English"}
      data-testid={`mic-${purpose}`}
      className={clsx(
        "relative grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
        recording ? "bg-rose text-white" : "text-forest hover:bg-forest-50",
        className,
      )}
    >
      {recording && <span className="absolute inset-0 animate-ping rounded-lg bg-rose/40" style={{ animationDuration: `${1.4 - level}s` }} />}
      {state === "processing" ? <Loader2 className="size-5 animate-spin" /> : recording ? <Square className="relative size-4 fill-current" /> : <Mic className="size-5" />}
    </button>
  );
}
