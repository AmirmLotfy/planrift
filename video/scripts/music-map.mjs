// Music analysis: loudness envelope (0.5 s windows), low/high band energy, onset strength and a
// tempo estimate. Prints a compact map so cuts and hits can follow the arrangement.
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const SR = 11025;
const pcm = execFileSync(
  'ffmpeg',
  [
    '-v',
    'error',
    '-i',
    path.join(root, 'inbox', 'music.mp3'),
    '-ac',
    '1',
    '-ar',
    String(SR),
    '-f',
    'f32le',
    '-',
  ],
  {
    maxBuffer: 1 << 30,
  },
);
const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);

// One-pole filters for a crude low band (< ~200 Hz) and high band (> ~3 kHz).
const lowA = Math.exp((-2 * Math.PI * 200) / SR);
const highA = Math.exp((-2 * Math.PI * 3000) / SR);
const hop = Math.round(SR * 0.02); // 20 ms frames for onsets
let lp = 0;
let lp2 = 0;
const frames = [];
for (let i = 0; i + hop <= x.length; i += hop) {
  let all = 0;
  let low = 0;
  let high = 0;
  for (let k = i; k < i + hop; k++) {
    const v = x[k];
    lp = lowA * lp + (1 - lowA) * v;
    lp2 = highA * lp2 + (1 - highA) * v;
    const hp = v - lp2;
    all += v * v;
    low += lp * lp;
    high += hp * hp;
  }
  frames.push({ all: all / hop, low: low / hop, high: high / hop });
}
const db = (p) => 10 * Math.log10(p + 1e-12);

// Onset strength: positive change of log energy in the high band (percussive) plus full band.
const onset = frames.map((f, i) =>
  i === 0
    ? 0
    : Math.max(0, db(f.high) - db(frames[i - 1].high)) + 0.5 * Math.max(0, db(f.all) - db(frames[i - 1].all)),
);
// Tempo: autocorrelation of the onset envelope over 0.3–1.2 s lags.
let best = { lag: 0, r: -1 };
for (let lag = 15; lag <= 60; lag++) {
  let r = 0;
  for (let i = lag; i < onset.length; i++) r += onset[i] * onset[i - lag];
  if (r > best.r) best = { lag, r };
}
const beat = best.lag * 0.02;
console.log(
  `duration ${(x.length / SR).toFixed(2)} s · strongest periodicity ${beat.toFixed(2)} s (≈ ${(60 / beat).toFixed(1)} BPM, or ${(120 / beat).toFixed(1)} if that is a half beat)`,
);

// 1-second loudness map with low / high balance.
const perSec = Math.round(1 / 0.02);
const rows = [];
for (let s = 0; s * perSec < frames.length; s++) {
  const chunk = frames.slice(s * perSec, (s + 1) * perSec);
  const avg = (k) => chunk.reduce((a, f) => a + f[k], 0) / chunk.length;
  const L = db(avg('all'));
  const bar = '#'.repeat(Math.max(0, Math.round((L + 45) / 1.5)));
  rows.push(
    `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')} ${L.toFixed(1).padStart(6)} dB  low ${db(avg('low')).toFixed(0).padStart(4)}  high ${db(avg('high')).toFixed(0).padStart(4)}  ${bar}`,
  );
}
console.log(rows.join('\n'));

// Biggest onset peaks (candidate hits), at least 1.5 s apart.
const peaks = onset
  .map((v, i) => ({ t: i * 0.02, v }))
  .sort((a, b) => b.v - a.v)
  .reduce(
    (acc, p) => (acc.length < 24 && acc.every((q) => Math.abs(q.t - p.t) > 1.5) ? [...acc, p] : acc),
    [],
  )
  .sort((a, b) => a.t - b.t);
console.log('strong onsets:', peaks.map((p) => `${p.t.toFixed(2)}s(${p.v.toFixed(0)})`).join(' '));
