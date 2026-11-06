/**
 * Adaptive end-of-speech detection. Microphones with noise suppression and auto-gain make any
 * fixed loudness threshold unreliable, so we track the room's noise floor and compare each
 * frame against it: speech is clearly above the floor, silence is close to it.
 */
export class SilenceDetector {
  private floor = 0;
  private calibrated = false;
  private calibration: number[] = [];
  private loudFrames = 0;
  private heardAt = 0;
  private lastVoiceAt = 0;

  constructor(
    private opts = {
      calibrateMs: 250,
      silenceMs: 1300,
      minSpeechMs: 400,
      minSpeechRms: 0.012,
      minSilenceRms: 0.006,
    },
  ) {}

  /** Feed one frame's RMS at time `now` (ms). Returns true when the speaker has finished. */
  push(rms: number, now: number, startedAt: number): boolean {
    const o = this.opts;
    if (!this.calibrated) {
      this.calibration.push(rms);
      if (now - startedAt < o.calibrateMs) return false;
      // Cap the floor in case the user started talking immediately.
      this.floor = Math.min(0.02, this.calibration.reduce((a, b) => a + b, 0) / this.calibration.length);
      this.calibrated = true;
    }
    const speech = Math.max(o.minSpeechRms, this.floor * 3);
    const silence = Math.max(o.minSilenceRms, this.floor * 1.8);

    if (rms > speech) {
      this.loudFrames++;
      // Two consecutive loud frames (~170 ms) count as speech, not a click or bump.
      if (this.loudFrames >= 2 && !this.heardAt) this.heardAt = now;
    } else {
      this.loudFrames = 0;
      // Adapt the floor during non-speech: quickly downwards, slowly upwards.
      this.floor = rms < this.floor ? this.floor * 0.7 + rms * 0.3 : this.floor * 0.97 + rms * 0.03;
    }
    if (rms > silence) this.lastVoiceAt = now;

    return !!this.heardAt && now - this.heardAt >= o.minSpeechMs && now - this.lastVoiceAt >= o.silenceMs;
  }

  get heardSpeech() {
    return !!this.heardAt;
  }
}
