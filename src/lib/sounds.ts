export type SoundId = "rain" | "fire" | "sea" | "birds";

export const SOUNDS: { id: SoundId; label: string; emoji: string }[] = [
  { id: "rain", label: "مطر", emoji: "🌧️" },
  { id: "fire", label: "نار", emoji: "🔥" },
  { id: "sea", label: "بحر", emoji: "🌊" },
  { id: "birds", label: "طبيعة وعصافير", emoji: "🐦" },
];

function noiseBuffer(ctx: AudioContext, seconds: number, shape: (i: number, n: number) => number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;
    data[i] = shape(i, length) * (shape.length >= 0 ? 1 : 1) * (white * 0.5 + brown * 3);
  }
  return buffer;
}

/** Pre-baked looping buffers: no timers, no randomness at runtime. */
function makeBuffer(ctx: AudioContext, id: SoundId): AudioBuffer {
  if (id === "rain") return noiseBuffer(ctx, 3, () => 0.5);
  if (id === "sea") {
    return noiseBuffer(ctx, 8, (i, n) => 0.35 + 0.3 * Math.sin((i / n) * Math.PI * 2 * 2));
  }
  if (id === "fire") {
    return noiseBuffer(ctx, 4, () => {
      // sparse crackle pops over a soft rumble
      return Math.random() < 0.002 ? 1.6 : 0.35;
    });
  }
  // birds: soft wind bed with baked chirp sweeps
  const length = Math.floor(ctx.sampleRate * 8);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * 0.05;
  let t = 0.4;
  while (t < 7.5) {
    const start = Math.floor(t * ctx.sampleRate);
    const chirpLen = Math.floor(ctx.sampleRate * (0.12 + Math.random() * 0.15));
    const f0 = 2200 + Math.random() * 1800;
    const f1 = f0 * (0.7 + Math.random() * 0.8);
    for (let i = 0; i < chirpLen && start + i < length; i++) {
      const p = i / chirpLen;
      const freq = f0 + (f1 - f0) * p;
      const env = Math.sin(p * Math.PI);
      data[start + i] += Math.sin((2 * Math.PI * freq * i) / ctx.sampleRate) * env * 0.35;
    }
    t += 0.5 + Math.random() * 1.4;
  }
  return buffer;
}

type Active = { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode };

/** Web Audio soundscape engine. Created lazily on first user gesture; survives navigation. */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private active = new Map<SoundId, Active>();
  private listeners = new Set<() => void>();

  private ensure() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  isPlaying = (id: SoundId) => this.active.has(id);
  playingIds = () => [...this.active.keys()];

  start(id: SoundId, volume: number) {
    if (this.active.has(id)) return;
    const ctx = this.ensure();
    const source = ctx.createBufferSource();
    source.buffer = makeBuffer(ctx, id);
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = id === "birds" ? "highpass" : "lowpass";
    filter.frequency.value = id === "rain" ? 1600 : id === "sea" ? 700 : id === "fire" ? 2400 : 400;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
    this.active.set(id, { source, gain, filter });
    this.emit();
  }

  stop(id: SoundId) {
    const entry = this.active.get(id);
    if (!entry) return;
    try { entry.source.stop(); } catch { /* already stopped */ }
    entry.source.disconnect();
    entry.gain.disconnect();
    this.active.delete(id);
    this.emit();
  }

  toggle(id: SoundId, volume: number) {
    if (this.active.has(id)) this.stop(id);
    else this.start(id, volume);
  }

  setVolume(id: SoundId, volume: number) {
    const entry = this.active.get(id);
    if (entry && this.ctx) entry.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.05);
  }

  stopAll() {
    for (const id of [...this.active.keys()]) this.stop(id);
  }

  /** Short soft alert beep for session transitions and attendance checks. */
  beep() {
    try {
      const ctx = this.ensure();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
    } catch { /* audio unavailable */ }
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private emit() { this.listeners.forEach((listener) => listener()); }
}

export const soundEngine = new SoundEngine();
