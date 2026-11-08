// Sound effects synthesised from scratch (oscillators, filtered noise, envelopes, a small Schroeder
// reverb). No samples, so there is nothing to license. Output: public/media/sfx/*.wav, 48 kHz stereo.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SR = 48000;
const out = path.resolve(import.meta.dirname, '..', 'public', 'media', 'sfx');
mkdirSync(out, { recursive: true });

let seed = 7;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;

/** RBJ biquad; type 'lp' | 'hp' | 'bp'. Coefficients recomputed per sample when f varies. */
function biquad() {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return (x, type, f, q = 0.707) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const a = Math.sin(w) / (2 * q);
    const c = Math.cos(w);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [a, 0, -a];
    const a0 = 1 + a;
    // y = (b0 x + b1 x1 + b2 x2 − a1 y1 − a2 y2) / a0 with a1 = −2cos(w), a2 = 1 − α.
    const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * c * y1 - (1 - a) * y2) / a0;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    return y;
  };
}

/** Small Schroeder reverb (4 combs, 2 allpasses), returns a stereo pair of tails. */
function reverb(mono, { mix = 0.25, decay = 0.78, damp = 0.35 } = {}) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ d, buf: new Float32Array(d), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ d, buf: new Float32Array(d), i: 0 }));
  const L = new Float32Array(mono.length);
  const R = new Float32Array(mono.length);
  for (let n = 0; n < mono.length; n++) {
    let acc = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * (1 - damp) + c.lp * damp;
      c.buf[c.i] = mono[n] + c.lp * decay;
      c.i = (c.i + 1) % c.d;
      acc += y;
    }
    let s = acc / 4;
    for (const a of aps) {
      const y = a.buf[a.i];
      const v = s + y * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.d;
      s = y - v * 0.5;
    }
    L[n] = mono[n] * (1 - mix) + s * mix;
    R[n] = mono[n] * (1 - mix) + s * mix * 0.92 + (n > 11 ? L[n - 11] * 0.04 : 0);
  }
  return [L, R];
}

const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const make = (seconds, fn) => {
  const n = Math.round(seconds * SR);
  const m = new Float32Array(n);
  for (let i = 0; i < n; i++) m[i] = fn(i / SR, i);
  return m;
};

function write(name, L, R = L, peakDb = -4) {
  let peak = 1e-9;
  for (let i = 0; i < L.length; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = 10 ** (peakDb / 20) / peak;
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  // 5 ms fade at both ends so nothing clicks.
  const fade = Math.round(0.005 * SR);
  for (let i = 0; i < n; i++) {
    const f = Math.min(1, i / fade, (n - 1 - i) / fade);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(L[i] * g * f * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(R[i] * g * f * 32767))), 46 + i * 4);
  }
  writeFileSync(path.join(out, `${name}.wav`), buf);
}

// Technical pen on heavy paper: band-limited noise with a fine grain, long and quiet.
{
  const bp = biquad();
  const lp = biquad();
  let grain = 0;
  const m = make(1.8, (t) => {
    grain = 0.995 * grain + 0.005 * Math.abs(noise());
    const e = Math.min(1, t / 0.06) * Math.min(1, (1.8 - t) / 0.25);
    return lp(bp(noise(), 'bp', 4200, 0.9), 'lp', 7500) * e * (0.6 + 2.4 * grain);
  });
  write('pen', ...reverb(m, { mix: 0.08 }), -14);
}

// Airy whoosh: noise through a resonant band-pass sweeping up, panned left to right.
{
  const bp = biquad();
  const D = 0.75;
  const m = make(D, (t) => {
    const p = t / D;
    const e =
      p < 0.6 ? Math.sin(((p / 0.6) * Math.PI) / 2) ** 2 : Math.cos((((p - 0.6) / 0.4) * Math.PI) / 2) ** 2;
    return bp(noise(), 'bp', 350 * 8 ** p, 1.1) * e;
  });
  const L = m.map((v, i) => v * Math.cos(((i / m.length) * Math.PI) / 2));
  const R = m.map((v, i) => v * Math.sin(((i / m.length) * Math.PI) / 2));
  write('whoosh', L, R, -8);
}

// Door striking a wooden console: knock transient, woody body, low thump with a pitch drop.
{
  const bpBody = biquad();
  const hp = biquad();
  let ph = 0;
  const m = make(0.9, (t) => {
    const f = 55 + 45 * Math.exp(-t / 0.05);
    ph += (2 * Math.PI * f) / SR;
    const thump = Math.sin(ph) * env(t, 0.002, 0.16);
    const body = bpBody(noise(), 'bp', 240, 5) * env(t, 0.001, 0.09) * 3.2;
    const knock = hp(noise(), 'hp', 2500) * env(t, 0.0005, 0.012) * 0.8;
    return thump * 1.1 + body + knock;
  });
  write('thud', ...reverb(m, { mix: 0.18, decay: 0.7 }), -3);
}

// Rubber stamp on a desk: short low thump plus a paper slap.
{
  const bp = biquad();
  let ph = 0;
  const m = make(0.55, (t) => {
    ph += (2 * Math.PI * (70 + 60 * Math.exp(-t / 0.03))) / SR;
    return Math.sin(ph) * env(t, 0.001, 0.07) + bp(noise(), 'bp', 1600, 1.4) * env(t, 0.0008, 0.02) * 1.6;
  });
  write('stamp', ...reverb(m, { mix: 0.12 }), -5);
}

// Soft deep impact for the title: sub drop, filtered noise bloom, long warm tail.
{
  const lp = biquad();
  let ph = 0;
  const m = make(3.2, (t) => {
    ph += (2 * Math.PI * (36 + 26 * Math.exp(-t / 0.35))) / SR;
    const sub = Math.sin(ph) * env(t, 0.006, 0.9);
    const bloom = lp(noise(), 'lp', 300 + 900 * Math.exp(-t / 0.15)) * env(t, 0.004, 0.45) * 0.7;
    return sub + bloom;
  });
  write('hit', ...reverb(m, { mix: 0.3, decay: 0.84, damp: 0.5 }), -3);
}

// UI click: two short pings, glassy and quiet.
{
  let p1 = 0;
  let p2 = 0;
  const m = make(0.12, (t) => {
    p1 += (2 * Math.PI * 1850) / SR;
    p2 += (2 * Math.PI * 3700) / SR;
    return Math.sin(p1) * env(t, 0.0005, 0.012) + Math.sin(p2) * env(t, 0.0003, 0.005) * 0.5;
  });
  write('click', ...reverb(m, { mix: 0.15 }), -12);
}

// Keystroke: a soft plastic tick.
{
  const bp = biquad();
  const m = make(
    0.08,
    (t) =>
      bp(noise(), 'bp', 2600, 2.2) * env(t, 0.0004, 0.008) +
      Math.sin(2 * Math.PI * 900 * t) * env(t, 0.0005, 0.01) * 0.4,
  );
  write('key', m, m, -16);
}

// Highlighter swipe: felt tip on paper, a quick stroke with a little squeak.
{
  const bp = biquad();
  const D = 0.55;
  const m = make(D, (t) => {
    const p = t / D;
    const e = Math.sin(p * Math.PI) ** 0.7;
    return bp(noise(), 'bp', 2400 + 2000 * p, 1.6) * e * (0.8 + 0.2 * Math.sin(2 * Math.PI * 38 * t));
  });
  write('marker', ...reverb(m, { mix: 0.06 }), -12);
}

// Paper sheet sliding onto a desk, ending in a soft tap.
{
  const lp = biquad();
  const D = 0.7;
  const m = make(D, (t) => {
    const p = t / D;
    const slide = lp(noise(), 'lp', 1400 + 1800 * p) * Math.sin(Math.min(1, p / 0.85) * Math.PI) * 0.6;
    const tap = t > 0.62 ? Math.sin(2 * Math.PI * 160 * (t - 0.62)) * Math.exp(-(t - 0.62) / 0.02) : 0;
    return slide + tap;
  });
  write('paper', ...reverb(m, { mix: 0.08 }), -12);
}

// Stitch snap: a tight click with a low tick, for each suture in the montage.
{
  const hp = biquad();
  let ph = 0;
  const m = make(0.18, (t) => {
    ph += (2 * Math.PI * (300 + 500 * Math.exp(-t / 0.01))) / SR;
    return hp(noise(), 'hp', 3000) * env(t, 0.0003, 0.006) + Math.sin(ph) * env(t, 0.001, 0.03) * 0.8;
  });
  write('snap', ...reverb(m, { mix: 0.12 }), -10);
}

// "It's alive": crackling spark that accelerates over a rising hum.
{
  const hp = biquad();
  const lp = biquad();
  let ph = 0;
  const D = 1.6;
  const m = make(D, (t) => {
    const p = t / D;
    ph += (2 * Math.PI * (90 + 60 * p)) / SR;
    const hum =
      lp(Math.sign(Math.sin(ph)) * 0.5 + Math.sin(ph * 2) * 0.3, 'lp', 600 + 1400 * p) * p * p * 0.5;
    const crackle = rand() < 0.002 + 0.02 * p * p ? 1 : 0;
    const spark = hp(crackle ? noise() * 4 : noise() * 0.02, 'hp', 2400);
    return (hum + spark) * Math.min(1, (D - t) / 0.12);
  });
  write('spark', ...reverb(m, { mix: 0.2 }), -6);
}

// Soft pop for panels appearing.
{
  let ph = 0;
  const m = make(0.16, (t) => {
    ph += (2 * Math.PI * (280 + 420 * Math.exp(-t / 0.02))) / SR;
    return Math.sin(ph) * env(t, 0.002, 0.04);
  });
  write('pop', ...reverb(m, { mix: 0.15 }), -10);
}

console.log('sfx written to', out);
