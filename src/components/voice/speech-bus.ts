"use client";

// One spoken reply at a time: starting a new one, or tapping the mic, stops the current one.
let current: HTMLAudioElement | null = null;

export async function playExclusive(el: HTMLAudioElement) {
  if (current && current !== el) stopSpeech();
  current = el;
  el.currentTime = 0;
  await el.play();
}

export function stopSpeech() {
  if (!current) return;
  current.pause();
  current.currentTime = 0;
  // Let listeners (e.g. a button showing "Speaking…") reset their state.
  current.dispatchEvent(new Event("ended"));
  current = null;
}
