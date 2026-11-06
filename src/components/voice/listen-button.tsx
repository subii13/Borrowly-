"use client";

import { useRef, useState } from "react";
import { AudioLines, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

/** Plays a server-composed spoken reply (Gnani Timbre) — e.g. a Tamil booking summary. */
export function ListenButton({ src, label = "கேட்க / Listen in Tamil" }: { src: string; label?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audio = useRef<HTMLAudioElement | null>(null);

  const play = async () => {
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      if (!audio.current) {
        const res = await fetch(src);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Spoken reply unavailable");
        }
        audio.current = new Audio(URL.createObjectURL(await res.blob()));
        audio.current.onended = () => setState("idle");
      }
      audio.current.currentTime = 0;
      await audio.current.play();
      setState("playing");
    } catch (e) {
      setState("idle");
      toast.error((e as Error).message);
    }
  };

  return (
    <button type="button" onClick={play} disabled={state === "loading"} data-testid="listen" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-forest ring-1 ring-forest/20 hover:bg-forest-50 disabled:opacity-60">
      {state === "loading" ? <Loader2 className="size-4 animate-spin" /> : state === "playing" ? <AudioLines className="size-4" /> : <Volume2 className="size-4" />}
      {state === "playing" ? "Stop" : label}
    </button>
  );
}
