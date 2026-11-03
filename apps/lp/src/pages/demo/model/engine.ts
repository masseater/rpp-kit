import { Array as Arr, Match, Record as Rec, String as Str, pipe } from "effect";
import type { Note } from "rpp-kit";

type Voice = Readonly<{ wave: OscillatorType; gain: number; attack: number; release: number }>;

type Hit = Readonly<{ track: string; note: Note; at: number }>;

type NoiseShape = Readonly<{
  filter: BiquadFilterType;
  frequency: number;
  length: number;
  gain: number;
}>;

type Engine = Readonly<{
  tone: (hit: Hit, voice: Voice) => void;
  kick: (hit: Hit) => void;
  hiss: (hit: Hit, shape: NoiseShape) => void;
  now: () => number;
  close: () => Promise<void>;
}>;

const VOICES: Readonly<Record<string, Voice>> = {
  Bass: { wave: "sawtooth", gain: 0.2, attack: 0.005, release: 0.08 },
  Piano: { wave: "triangle", gain: 0.12, attack: 0.002, release: 0.3 },
  Guitar: { wave: "square", gain: 0.04, attack: 0.002, release: 0.08 },
  Strings: { wave: "triangle", gain: 0.06, attack: 0.25, release: 0.4 },
  Melody: { wave: "square", gain: 0.07, attack: 0.01, release: 0.1 },
};

const DEFAULT_VOICE: Voice = { wave: "triangle", gain: 0.1, attack: 0.01, release: 0.1 };

const DRUMS = "Drums";

const KICK = 36;

const SNARE_PITCHES = { sideStick: 37, snare: 38, clap: 39, electricSnare: 40 } as const;

const SNARES = new Set<number>(Rec.values(SNARE_PITCHES));

const MAX_VELOCITY = 127;

const TUNING = { a4: 440, a4Note: 69, semitones: 12, octave: 2 } as const;

const MASTER_GAIN = 0.8;

const SILENCE = 0;

const FADE_FLOOR = 0.001;

const KICK_SHAPE = { from: 150, to: 40, sweep: 0.12, length: 0.25, gain: 0.6 } as const;

const NOISE_SHAPE = {
  snare: { filter: "bandpass", frequency: 1800, length: 0.18, gain: 0.35 },
  hat: { filter: "highpass", frequency: 7000, length: 0.05, gain: 0.12 },
} as const;

const NOISE_SEED = { scale: 12.9898, spread: 43_758.5453, range: 2, offset: 1 } as const;

const frequency = (pitch: number): number =>
  TUNING.a4 * TUNING.octave ** ((pitch - TUNING.a4Note) / TUNING.semitones);

const noiseSample = (index: number): number => {
  const value = Math.sin(index * NOISE_SEED.scale) * NOISE_SEED.spread;
  return (value - Math.floor(value)) * NOISE_SEED.range - NOISE_SEED.offset;
};

const MONO = 1;

const level = (note: Note, gain: number): number => gain * (note.velocity / MAX_VELOCITY);

const createEngine = (): Engine => {
  const context = new AudioContext();
  const master = new GainNode(context, { gain: MASTER_GAIN });
  master.connect(context.destination);
  const noise = new AudioBuffer({
    length: context.sampleRate,
    numberOfChannels: MONO,
    sampleRate: context.sampleRate,
  });
  noise.copyToChannel(
    Float32Array.from({ length: context.sampleRate }, (_value, index) => noiseSample(index)),
    SILENCE,
  );
  const tone = ({ note, at }: Hit, voice: Voice): void => {
    const end = at + Math.max(voice.attack, note.duration) + voice.release;
    const envelope = new GainNode(context, { gain: SILENCE });
    envelope.gain.linearRampToValueAtTime(level(note, voice.gain), at + voice.attack);
    envelope.gain.linearRampToValueAtTime(SILENCE, end);
    const oscillator = new OscillatorNode(context, {
      type: voice.wave,
      frequency: frequency(note.pitch),
    });
    oscillator.connect(envelope).connect(master);
    oscillator.start(at);
    oscillator.stop(end);
  };
  const kick = ({ note, at }: Hit): void => {
    const oscillator = new OscillatorNode(context, { frequency: KICK_SHAPE.from });
    oscillator.frequency.exponentialRampToValueAtTime(KICK_SHAPE.to, at + KICK_SHAPE.sweep);
    const envelope = new GainNode(context, { gain: level(note, KICK_SHAPE.gain) });
    envelope.gain.exponentialRampToValueAtTime(FADE_FLOOR, at + KICK_SHAPE.length);
    oscillator.connect(envelope).connect(master);
    oscillator.start(at);
    oscillator.stop(at + KICK_SHAPE.length);
  };
  const hiss = ({ note, at }: Hit, shape: NoiseShape): void => {
    const envelope = new GainNode(context, { gain: level(note, shape.gain) });
    envelope.gain.exponentialRampToValueAtTime(FADE_FLOOR, at + shape.length);
    const filter = new BiquadFilterNode(context, {
      type: shape.filter,
      frequency: shape.frequency,
    });
    const source = new AudioBufferSourceNode(context, { buffer: noise });
    source.connect(filter).connect(envelope).connect(master);
    source.start(at);
    source.stop(at + shape.length);
  };
  return { tone, kick, hiss, now: () => context.currentTime, close: () => context.close() };
};

const instrumentOf = (track: string): string =>
  pipe(track, Str.trim, Str.split(" "), Arr.headNonEmpty);

const drumOf = (pitch: number): "kick" | "snare" | "hat" =>
  Match.value(pitch).pipe(
    Match.when(KICK, () => "kick" as const),
    Match.when(
      (value) => SNARES.has(value),
      () => "snare" as const,
    ),
    Match.orElse(() => "hat" as const),
  );

const play =
  (engine: Engine) =>
  (hit: Hit): void => {
    const instrument = instrumentOf(hit.track);
    if (instrument !== DRUMS) {
      engine.tone(hit, VOICES[instrument] ?? DEFAULT_VOICE);
      return;
    }
    const drum = drumOf(hit.note.pitch);
    if (drum === "kick") {
      engine.kick(hit);
      return;
    }
    engine.hiss(hit, NOISE_SHAPE[drum]);
  };

export { createEngine, play };
export type { Engine, Hit };
