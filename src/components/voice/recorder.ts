"use client";

// Captures microphone audio and encodes 16 kHz mono 16-bit WAV in the browser, which
// Gnani Prisma accepts directly (MediaRecorder's WebM/Opus is not a supported format).

const TARGET_RATE = 16_000;

export type Recording = { blob: Blob; seconds: number };

export class WavRecorder {
  private ctx?: AudioContext;
  private stream?: MediaStream;
  private node?: ScriptProcessorNode;
  private chunks: Float32Array[] = [];
  private rate = 48_000;
  private startedAt = 0;
  private heardSpeechAt = 0;
  private lastLoudAt = 0;

  constructor(private opts: { maxSeconds: number; onLevel?: (level: number) => void; onAutoStop?: () => void }) {}

  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.ctx = new AudioContext();
    this.rate = this.ctx.sampleRate;
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    this.chunks = [];
    this.startedAt = performance.now();
    this.heardSpeechAt = 0;
    this.node.onaudioprocess = (e) => {
      const data = new Float32Array(e.inputBuffer.getChannelData(0));
      this.chunks.push(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
      const level = Math.min(1, Math.sqrt(sum / data.length) * 8);
      this.opts.onLevel?.(level);
      const now = performance.now();
      if (level > 0.12) {
        this.lastLoudAt = now;
        if (!this.heardSpeechAt) this.heardSpeechAt = now;
      }
      const elapsed = (now - this.startedAt) / 1000;
      // Stop after ~1.6 s of silence once the user has spoken, or at the time limit.
      if ((this.heardSpeechAt && now - this.lastLoudAt > 1600 && now - this.heardSpeechAt > 800) || elapsed >= this.opts.maxSeconds) this.opts.onAutoStop?.();
    };
    source.connect(this.node);
    this.node.connect(this.ctx.destination);
  }

  async stop(): Promise<Recording> {
    this.node?.disconnect();
    if (this.node) this.node.onaudioprocess = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    const length = this.chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Float32Array(length);
    let offset = 0;
    for (const c of this.chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    const samples = resample(merged, this.rate, TARGET_RATE);
    return { blob: encodeWav(samples, TARGET_RATE), seconds: samples.length / TARGET_RATE };
  }

  cancel() {
    void this.stop();
  }
}

function resample(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    // Average the source samples covering this output sample (simple anti-aliasing).
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    out[i] = end > start ? sum / (end - start) : input[start] ?? 0;
  }
  return out;
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}
