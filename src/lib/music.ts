/**
 * Sound for the invitation: a looping background song and a one-off opening chime.
 *
 * - The song (`wedding.music.song`) is decoded once and looped gap-free from memory,
 *   with an HTML5 <audio loop> element as the streaming fallback. Both go through a
 *   Web Audio gain node so fades work everywhere (iOS ignores `audio.volume`).
 *   If the file is missing or can't play, a gentle instrumental is generated live instead.
 * - The chime (`wedding.music.chime`) plays as the wax seal breaks; a synthesised
 *   chime stands in if the file is missing.
 * - Nothing is stored: every page load starts fresh, so the chime and music play again
 *   when the envelope is opened. Within one page view, a guest who mutes stays muted.
 *   Browsers only allow sound after a user gesture, so playback always starts from a tap.
 */
import { wedding } from '../config/wedding';

type Listener = () => void;
type Preference = 'on' | 'off' | null;

const cfg = wedding.music;

/* ---------- Shared audio context (created inside a user gesture) ---------- */

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  ctx = new Ctx();
  return ctx;
}

/** Call synchronously from a click/tap handler so the browser lets audio start. */
function unlock(): AudioContext | null {
  const c = audioContext();
  if (c && c.state !== 'running') void c.resume().catch(() => undefined);
  return c;
}

/* ---------- Fades ---------- */

interface Fader {
  get(): number;
  set(value: number): void;
}

/** Smooth fade on an equal-power curve, so loudness rises and falls evenly. Returns a cancel function. */
function fade(target: Fader, to: number, seconds: number, done?: () => void): () => void {
  const from = target.get();
  const start = performance.now();
  const ms = Math.max(1, seconds * 1000);
  let raf = 0;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(safety);
    target.set(to);
    done?.();
  };
  const step = (now: number) => {
    if (finished) return;
    const p = Math.min(1, (now - start) / ms);
    if (p >= 1) return finish();
    // ease-in-out sine
    target.set(from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * p)));
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  // rAF pauses in background tabs; make sure the fade still lands.
  const safety = window.setTimeout(finish, ms + 400);
  return () => {
    finished = true;
    cancelAnimationFrame(raf);
    window.clearTimeout(safety);
  };
}

function gainFader(gain: GainNode): Fader {
  return {
    get: () => gain.gain.value,
    set: (v) => gain.gain.setValueAtTime(v, gain.context.currentTime),
  };
}

/* ---------- Engines ---------- */

interface Engine {
  /** Must be called from inside the user gesture (or after the context is running). */
  start(): Promise<void>;
  fadeAudioIn(delay?: number): void;
  fadeAudioOut(onDone?: () => void): void;
}

/** Files up to this size (about 2 minutes of MP3) are decoded for a gap-free loop; bigger ones stream. */
const MAX_DECODE_BYTES = 2.5 * 1024 * 1024;

/** How much of the track's fade-out is blended into the start of the next repeat (seconds). */
const LOOP_OVERLAP = 0.75;

/**
 * Turn a decoded track into a seamless loop: trim the encoder's silent padding from both ends,
 * then mix the last moments of the fade-out over the opening so the repeat has no gap or click.
 */
function makeSeamlessLoop(src: AudioBuffer): AudioBuffer {
  const { numberOfChannels: channels, sampleRate: rate, length } = src;
  const data = Array.from({ length: channels }, (_, ch) => src.getChannelData(ch));
  const threshold = 1e-3; // about -60 dB
  const loud = (i: number) => data.some((d) => Math.abs(d[i]) > threshold);
  let start = 0;
  while (start < length - 1 && !loud(start)) start++;
  let end = length - 1;
  while (end > start && !loud(end)) end--;
  const pad = Math.round(rate * 0.002);
  start = Math.max(0, start - pad);
  end = Math.min(length, end + pad);

  const span = end - start;
  const overlap = Math.min(Math.round(rate * LOOP_OVERLAP), Math.floor(span / 4));
  const loopLength = span - overlap;
  if (loopLength <= rate) return src; // too short to bother

  const out = new AudioBuffer({ numberOfChannels: channels, length: loopLength, sampleRate: rate });
  for (let ch = 0; ch < channels; ch++) {
    const from = data[ch];
    const to = out.getChannelData(ch);
    to.set(from.subarray(start, start + loopLength));
    for (let i = 0; i < overlap; i++) to[i] += from[start + loopLength + i];
  }
  return out;
}

function decode(bytes: ArrayBuffer): Promise<AudioBuffer> {
  // An offline context decodes without needing a user gesture, so the song is ready before the click.
  const Offline =
    window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Offline) return Promise.reject(new Error('no offline audio'));
  const off = new Offline(2, 1, 44100);
  return new Promise((resolve, reject) => {
    const p = off.decodeAudioData(bytes, resolve, reject);
    if (p && typeof p.then === 'function') p.then(resolve, reject);
  });
}

/**
 * The background song. Preferred path: decoded into memory and looped with
 * `loop = true` on an AudioBufferSourceNode, gap-free. If the guest taps before
 * decoding finishes (or decoding isn't possible), an HTML5 <audio loop> element streams it instead.
 */
class SongEngine implements Engine {
  status: 'loading' | 'ready' | 'missing' = 'loading';
  private buffer: AudioBuffer | null = null;
  private source: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private offset = 0;
  private el: HTMLAudioElement | null = null;
  private elSource: MediaElementAudioSourceNode | null = null;
  private gain: GainNode | null = null;
  private cancelFade: (() => void) | null = null;

  constructor(private readonly src: string) {
    // Short tracks are decoded for a gap-free loop. Long songs would take tens of MB of
    // memory once decoded (too much for phones), so they stream with <audio loop> instead.
    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const size = Number(res.headers.get('content-length') ?? 0);
        if (size > 0 && size <= MAX_DECODE_BYTES) return this.decodeLoop();
        this.element(); // start buffering the stream
        this.status = 'ready';
      })
      .catch(() => (this.status = 'missing'));
  }

  private decodeLoop() {
    return fetch(this.src)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((bytes) => decode(bytes))
      .then(
        (buf) => {
          this.buffer = makeSeamlessLoop(buf);
          this.status = 'ready';
        },
        () => {
          this.element(); // file is fine, just stream it
          this.status = 'ready';
        },
      );
  }

  private output(c: AudioContext): GainNode {
    if (!this.gain) {
      this.gain = c.createGain();
      this.gain.gain.value = 0;
      this.gain.connect(c.destination);
    }
    return this.gain;
  }

  private element(): HTMLAudioElement {
    if (!this.el) {
      const el = document.createElement('audio');
      el.src = this.src;
      el.loop = true;
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
      this.el = el;
    }
    return this.el;
  }

  private fader(): Fader {
    if (this.gain) return gainFader(this.gain);
    const el = this.element();
    return { get: () => el.volume, set: (v) => (el.volume = Math.min(1, Math.max(0, v))) };
  }

  async start() {
    const c = audioContext();
    if (c && this.buffer) {
      // Gap-free loop from memory, picking up where it was paused.
      this.stopSource();
      const node = c.createBufferSource();
      node.buffer = this.buffer;
      node.loop = true;
      node.connect(this.output(c));
      node.start(0, this.offset % this.buffer.duration);
      this.startedAt = c.currentTime - this.offset;
      this.source = node;
      return;
    }
    // Streaming fallback: <audio loop>, routed through the gain node when possible so fades work on iOS.
    const el = this.element();
    if (c && !this.elSource) {
      try {
        this.elSource = c.createMediaElementSource(el);
        this.elSource.connect(this.output(c));
        el.volume = 1;
      } catch {
        this.elSource = null;
      }
    }
    if (!this.elSource) el.volume = 0;
    await el.play();
  }

  private stopSource() {
    if (!this.source) return;
    const c = this.source.context;
    if (this.buffer) this.offset = (c.currentTime - this.startedAt) % this.buffer.duration;
    try {
      this.source.stop();
    } catch {
      // already stopped
    }
    this.source.disconnect();
    this.source = null;
  }

  fadeAudioIn(delay = 0) {
    this.cancelFade?.();
    const f = this.fader();
    f.set(0.0001);
    const begin = () => (this.cancelFade = fade(f, cfg.volume, cfg.fadeIn));
    if (delay > 0) {
      const id = window.setTimeout(begin, delay * 1000);
      this.cancelFade = () => window.clearTimeout(id);
    } else begin();
  }

  fadeAudioOut(onDone?: () => void) {
    this.cancelFade?.();
    this.cancelFade = fade(this.fader(), 0, cfg.fadeOut, () => {
      this.stopSource();
      this.el?.pause();
      onDone?.();
    });
  }
}

/* Generated instrumental, used when the song file isn't available.
   I – vi – IV – V in C major: a music-box arpeggio over warm pads. */
const PROGRESSION = [
  [48, 52, 55, 59],
  [45, 48, 52, 55],
  [41, 45, 48, 52],
  [43, 47, 50, 57],
];
const EIGHTH = 60 / 66 / 2;
const BAR = EIGHTH * 8;
const midiToFreq = (m: number) => 440 * 2 ** ((m - 69) / 12);

class GeneratedEngine implements Engine {
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private timer: number | null = null;
  private nextBar = 0;
  private barIndex = 0;
  private cancelFade: (() => void) | null = null;

  constructor(private readonly c: AudioContext) {}

  async start() {
    if (!this.master) this.setup();
    if (this.c.state !== 'running') await this.c.resume();
    this.nextBar = Math.max(this.nextBar, this.c.currentTime + 0.1);
    if (this.timer === null) {
      this.timer = window.setInterval(() => this.schedule(), 200);
      this.schedule();
    }
  }

  fadeAudioIn(delay = 0) {
    this.cancelFade?.();
    const begin = () => (this.cancelFade = fade(gainFader(this.master!), cfg.volume * 0.6, cfg.fadeIn));
    if (delay > 0) {
      const id = window.setTimeout(begin, delay * 1000);
      this.cancelFade = () => window.clearTimeout(id);
    } else begin();
  }

  fadeAudioOut(onDone?: () => void) {
    this.cancelFade?.();
    if (!this.master) return onDone?.();
    this.cancelFade = fade(gainFader(this.master), 0, cfg.fadeOut, () => {
      if (this.timer !== null) window.clearInterval(this.timer);
      this.timer = null;
      onDone?.();
    });
  }

  private setup() {
    const c = this.c;
    const master = c.createGain();
    master.gain.value = 0;
    master.connect(c.destination);
    const reverb = c.createConvolver();
    const length = c.sampleRate * 3.2;
    const impulse = c.createBuffer(2, length, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.6;
    }
    reverb.buffer = impulse;
    const wet = c.createGain();
    wet.gain.value = 0.45;
    reverb.connect(wet).connect(master);
    const tone = c.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 3200;
    const bus = c.createGain();
    bus.connect(tone);
    tone.connect(master);
    tone.connect(reverb);
    this.master = master;
    this.bus = bus;
  }

  private schedule() {
    while (this.nextBar < this.c.currentTime + 1.5) {
      this.playBar(PROGRESSION[this.barIndex % PROGRESSION.length], this.nextBar);
      this.nextBar += BAR;
      this.barIndex += 1;
    }
  }

  private playBar(chord: number[], start: number) {
    const [root, third, fifth, colour] = chord;
    for (const note of [root - 12, root, fifth]) this.pad(midiToFreq(note), start, BAR);
    const pattern = [root + 12, fifth + 12, third + 24, fifth + 12, colour + 12, fifth + 12, third + 24, fifth + 12];
    pattern.forEach((note, i) => bell(this.c, this.bus!, midiToFreq(note), start + i * EIGHTH, i === 0 ? 0.11 : 0.07));
    if (this.barIndex % 2 === 1) bell(this.c, this.bus!, midiToFreq(third + 36), start + EIGHTH * 4, 0.05, 2.4);
  }

  private pad(freq: number, time: number, length: number) {
    const gain = this.c.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.028, time + length * 0.35);
    gain.gain.linearRampToValueAtTime(0.0001, time + length + 0.6);
    gain.connect(this.bus!);
    const osc = this.c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.detune.value = (Math.random() - 0.5) * 8;
    osc.connect(gain);
    osc.start(time);
    osc.stop(time + length + 0.7);
  }
}

function bell(c: AudioContext, out: AudioNode, freq: number, time: number, level: number, length = 1.6) {
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(level, time + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
  gain.connect(out);
  for (const [mult, type, amount] of [
    [1, 'triangle', 1],
    [2, 'sine', 0.25],
  ] as const) {
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.value = freq * mult;
    const partial = c.createGain();
    partial.gain.value = amount;
    osc.connect(partial).connect(gain);
    osc.start(time);
    osc.stop(time + length + 0.05);
  }
}

/* ---------- Opening chime ---------- */

let chimeEl: HTMLAudioElement | null = null;
let chimeMissing = false;

function preloadChime() {
  if (chimeEl || !cfg.chime) return;
  chimeEl = document.createElement('audio');
  chimeEl.src = cfg.chime;
  chimeEl.preload = 'auto';
  chimeEl.setAttribute('playsinline', '');
  chimeEl.volume = cfg.chimeVolume;
  chimeEl.addEventListener('error', () => (chimeMissing = true), { once: true });
}

/** A soft harp-like sparkle, synthesised, for when the chime file is missing. */
function synthChime(c: AudioContext) {
  const out = c.createGain();
  out.gain.value = cfg.chimeVolume * 0.9;
  out.connect(c.destination);
  const t0 = c.currentTime + 0.02;
  [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => bell(c, out, midiToFreq(m), t0 + i * 0.06, 0.09, 2.2));
  [96, 100, 103].forEach((m, i) => bell(c, out, midiToFreq(m), t0 + 0.5 + i * 0.1, 0.04, 1.4));
}

/* ---------- Shared player (one per page) ---------- */

let song: SongEngine | null = null;
let fallback: GeneratedEngine | null = null;
let active: Engine | null = null;
let playing = false;
let hiddenPause = false;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

/* The play/mute choice lives only in memory for this page view; a reload resets it. */
let pref: Preference = null;
function readPref(): Preference {
  return pref;
}
function writePref(v: 'on' | 'off') {
  pref = v;
}

function songEngine(): SongEngine | null {
  if (!cfg.song) return null;
  song ??= new SongEngine(cfg.song);
  return song;
}

function fallbackEngine(): GeneratedEngine | null {
  const c = audioContext();
  if (!c) return null;
  fallback ??= new GeneratedEngine(c);
  return fallback;
}

async function startEngine(delay: number): Promise<boolean> {
  const s = songEngine();
  if (s && s.status !== 'missing') {
    try {
      await s.start();
      active = s;
      s.fadeAudioIn(delay);
      return true;
    } catch {
      s.status = 'missing';
    }
  }
  const g = fallbackEngine();
  if (!g) return false;
  await g.start();
  active = g;
  g.fadeAudioIn(delay);
  return true;
}

/** Start music from inside a user gesture. */
async function begin(delay = 0, remember = true): Promise<boolean> {
  if (playing) return true;
  unlock();
  if (remember) writePref('on');
  playing = true;
  notify();
  try {
    const ok = await startEngine(delay);
    if (!ok) throw new Error('no audio');
    return true;
  } catch {
    playing = false;
    notify();
    return false;
  }
}

function stop(remember = true) {
  if (remember) writePref('off');
  playing = false;
  notify();
  active?.fadeAudioOut(() => {
    // Nothing audible left: let the device rest.
    if (!playing && ctx?.state === 'running') void ctx.suspend().catch(() => undefined);
  });
}

/* Start at the guest's first tap or key press (browsers block sound before that),
   unless they muted it on this page. Covers Skip and pages without the envelope. */
let armed = false;
function armResume() {
  if (armed || playing || readPref() === 'off') return;
  armed = true;
  const events = ['click', 'touchend', 'keydown'] as const;
  const handler = (e: Event) => {
    // The music button and the envelope start the music themselves.
    if (e.target instanceof Element && e.target.closest('.music-toggle, .envelope__hit')) return;
    disarm();
    if (!playing && readPref() !== 'off') void begin(0.2);
  };
  const disarm = () => {
    armed = false;
    events.forEach((ev) => document.removeEventListener(ev, handler, true));
  };
  events.forEach((ev) => document.addEventListener(ev, handler, true));
}

/* Pause while the tab is hidden; pick up again when the guest comes back. */
function onVisibility() {
  if (document.hidden) {
    if (playing) {
      hiddenPause = true;
      stop(false);
    }
  } else if (hiddenPause) {
    hiddenPause = false;
    if (readPref() !== 'on') return;
    if (ctx && ctx.state !== 'closed') void begin(0, false).then((ok) => ok || armResume());
    else armResume();
  }
}

let initialised = false;
function init() {
  if (initialised || typeof document === 'undefined') return;
  initialised = true;
  // Fetch the sounds early so they're ready the moment the envelope opens.
  songEngine();
  preloadChime();
  document.addEventListener('visibilitychange', onVisibility);
}

export const music = {
  isPlaying: () => playing,
  preference: readPref,
  subscribe(listener: Listener) {
    init();
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Prepare audio files and, if the guest left music on earlier in this visit, resume at their next tap. */
  init() {
    init();
    armResume();
  },
  /** Call from a click/tap handler. `delay` (seconds) holds the fade-in back, e.g. to let the chime ring first. */
  play(delay = 0) {
    init();
    return begin(delay);
  },
  pause() {
    stop();
  },
  toggle() {
    if (playing) {
      stop();
      return Promise.resolve(false);
    }
    return begin();
  },
  /** The opening chime. Call from the click/tap that opens the envelope. */
  playChime() {
    init();
    const c = unlock();
    if (chimeEl && !chimeMissing) {
      chimeEl.currentTime = 0;
      chimeEl.play().catch(() => c && synthChime(c));
    } else if (c) {
      synthChime(c);
    }
  },
};
