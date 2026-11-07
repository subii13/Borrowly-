"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { WavRecorder } from "./recorder";
import { stopSpeech } from "./speech-bus";
import { voiceActivity } from "./activity";

export type CaptureState = "idle" | "recording" | "processing";

/**
 * Records speech, sends it to /api/voice/transcribe (Gnani Prisma on the server) and hands the
 * JSON result back. `toggle` starts, or stops early; recording also stops after a pause.
 */
export function useVoiceCapture<T>({ purpose, onResult, maxSeconds = 20 }: { purpose: "search" | "listing" | "note"; onResult: (data: T) => void; maxSeconds?: number }) {
  const [state, setState] = useState<CaptureState>("idle");
  const [level, setLevel] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<WavRecorder | null>(null);
  const stopping = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (state !== "recording") return;
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(t);
  }, [state]);

  useEffect(
    () => () => {
      if (recorder.current) {
        recorder.current.cancel();
        voiceActivity.setMode("idle");
      }
    },
    [],
  );

  const finish = async () => {
    if (!recorder.current || stopping.current) return;
    stopping.current = true;
    setState("processing");
    voiceActivity.setMode("thinking");
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
      onResultRef.current(data as T);
    } catch {
      toast.error("Something went wrong with the recording. Please try again.");
    } finally {
      stopping.current = false;
      setState("idle");
      setLevel(0);
      if (voiceActivity.mode === "thinking") voiceActivity.setMode("idle");
    }
  };

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Your browser doesn't support microphone input.");
      return;
    }
    // Don't record our own spoken reply: silence it first.
    stopSpeech();
    try {
      recorder.current = new WavRecorder({
        maxSeconds,
        onLevel: (l) => {
          voiceActivity.level = l;
          setLevel(l);
        },
        onAutoStop: () => void finish(),
      });
      await recorder.current.start();
      setSeconds(0);
      setState("recording");
      voiceActivity.setMode("listening");
    } catch {
      recorder.current = null;
      toast.error("Microphone access was blocked. Allow it in your browser to use voice.");
    }
  };

  const toggle = () => (state === "idle" ? start() : state === "recording" ? finish() : undefined);
  return { state, level, seconds, toggle };
}
