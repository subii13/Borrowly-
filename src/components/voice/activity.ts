"use client";

// Shared, render-free voice state. The 3D orb reads it every animation frame; React components
// subscribe only to mode changes, so the microphone level never causes re-renders.

export type VoiceMode = "idle" | "listening" | "thinking" | "speaking";

type Listener = (mode: VoiceMode) => void;

export const voiceActivity = {
  mode: "idle" as VoiceMode,
  /** Microphone loudness 0–1, updated per audio frame while listening. */
  level: 0,
  listeners: new Set<Listener>(),
  setMode(mode: VoiceMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode !== "listening") this.level = 0;
    this.listeners.forEach((l) => l(mode));
  },
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  },
};
