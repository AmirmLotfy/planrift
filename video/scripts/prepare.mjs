// Builds src/events.json: captions (word level, on the final timeline), named moments the edit and
// the mix both use, and the sound-effect cue list. One source of timing for picture and sound.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LINES, TIMELINE, lineSpan, wordTime } from './lib/cues.mjs';

const root = path.resolve(import.meta.dirname, '..');
const W = (l, w, n = 0) => Math.round(wordTime(l, w, n) * 1000) / 1000;

// Captions: every line, split into pages of at most 7 words that break after punctuation.
const captions = LINES.map((l) => {
  const offset = TIMELINE.vo[l.id] - l.start;
  const words = l.words.map((w) => ({
    text: w.text,
    start: +(w.start + offset).toFixed(3),
    end: +(w.end + offset).toFixed(3),
  }));
  const pages = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    const breakHere = /[.,:;!?…]$/.test(w.text) ? cur.length >= 2 : cur.length >= 7;
    if (breakHere) {
      pages.push(cur);
      cur = [];
    }
  }
  if (cur.length) {
    if (cur.length <= 2 && pages.length) pages[pages.length - 1].push(...cur);
    else pages.push(cur);
  }
  const [start, end] = lineSpan(l.id);
  return {
    id: l.id,
    start: +start.toFixed(3),
    end: +end.toFixed(3),
    pages: pages.map((p) => ({ start: p[0].start, end: p.at(-1).end, words: p })),
  };
});

const moments = {
  // Opening (VO-02)
  moves: W('VO-02', 'moves'),
  out: W('VO-02', 'out'),
  opens: W('VO-02', 'opens'),
  slams: W('VO-02', 'slams'),
  furniture: W('VO-02', 'furniture'),
  // Title (VO-03)
  planrift: W('VO-03', 'PLANRIFT'),
  // Hero (VO-04/05)
  live: W('VO-04', 'live'),
  computed: W('VO-04', 'computed'),
  grab: W('VO-05', 'Grab'),
  millimetre: W('VO-05', 'millimetre'),
  // Studio (VO-06…VO-10)
  approved: W('VO-06', 'approved'),
  metre: W('VO-06', 'metre'),
  strip: W('VO-06', 'strip'),
  every: W('VO-06', 'every'),
  revisionA: W('VO-07', 'Revision'),
  three: W('VO-07', 'three'),
  fifteen: W('VO-08', 'fifteen'),
  push: W('VO-08', 'push'),
  planAnd3d: W('VO-09', 'Plan'),
  same: W('VO-09', 'same'),
  exact: W('VO-09', 'exact'),
  revisionB: W('VO-10', 'Revision'),
  full: W('VO-10', 'Full'),
  clear391: W('VO-10', 'Three'),
  // Review (VO-11/12)
  clearIsnt: W('VO-11', 'But'),
  floor: W('VO-11', 'floor'),
  elevation: W('VO-11', 'elevation'),
  schedule: W('VO-11', 'schedule.'),
  flags: W('VO-12', 'flags'),
  never: W('VO-12', 'never'),
  nextDoor: W('VO-12', 'next'),
  // Decide (VO-13/14)
  compare: W('VO-13', 'Compare'),
  submit: W('VO-13', 'Submit'),
  acknowledge: W('VO-13', 'acknowledge'),
  accept: W('VO-13', 'accept.'),
  receipt: W('VO-14', 'receipt,'),
  fingerprint: W('VO-14', 'fingerprint'),
  // Stitch (VO-15)
  frankenstein: W('VO-15', 'Frankenstein:'),
  cad: W('VO-15', 'CAD-style'),
  geometry: W('VO-15', 'geometry'),
  live3d: W('VO-15', 'live'),
  revisionControl: W('VO-15', 'revision'),
  ledger: W('VO-15', 'document'),
  audit: W('VO-15', 'audit'),
  stitched: W('VO-15', 'stitched'),
  oneEdit: W('VO-15', 'One'),
  flows: W('VO-15', 'flows'),
  // Kiro (VO-16/17)
  kiro: W('VO-16', 'Kiro'),
  specs: W('VO-16', 'five'),
  steering: W('VO-16', 'nine'),
  agents: W('VO-16', 'seven'),
  hooks: W('VO-17', 'Six'),
  tests: W('VO-17', 'tests'),
  secrets: W('VO-17', 'secrets'),
  nothing: W('VO-17', 'nothing'),
  // End (VO-18)
  endName: W('VO-18', 'PLANRIFT.'),
  know: W('VO-18', 'Know'),
};

// Sound effects (seconds on the final timeline, gain in dB relative to the file).
const sfx = [
  { t: 0.35, name: 'pen', gain: -6 },
  { t: 2.0, name: 'pen', gain: -9 },
  { t: moments.moves - 0.05, name: 'paper', gain: -8 },
  { t: moments.out + 0.02, name: 'stamp', gain: -2 },
  { t: moments.slams + 0.16, name: 'thud', gain: 0 },
  { t: 13.6, name: 'whoosh', gain: -6 },
  { t: 14.95, name: 'hit', gain: -4 },
  { t: 22.7, name: 'whoosh', gain: -8 },
  { t: 38.68, name: 'whoosh', gain: -9 },
  { t: 68.45, name: 'whoosh', gain: -10 },
  { t: 84.28, name: 'whoosh', gain: -9 },
  { t: 100.24, name: 'whoosh', gain: -10 },
  { t: 111.64, name: 'whoosh', gain: -7 },
  { t: moments.cad, name: 'pop', gain: -6 },
  { t: moments.geometry, name: 'pop', gain: -6 },
  { t: moments.live3d, name: 'pop', gain: -6 },
  { t: moments.revisionControl, name: 'pop', gain: -6 },
  { t: moments.ledger, name: 'pop', gain: -6 },
  { t: moments.audit, name: 'pop', gain: -6 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ t: moments.stitched + 0.1 + i * 0.09, name: 'snap', gain: -8 })),
  { t: 127.15, name: 'spark', gain: -4 },
  { t: 129.86, name: 'whoosh', gain: -6 },
  { t: 136.5, name: 'whoosh', gain: -10 },
  { t: 143.86, name: 'whoosh', gain: -8 },
  { t: 153.7, name: 'hit', gain: -6 },
];

// Interface sounds from the capture logs: each real click and key press, placed where the edit shows
// it. [capture, shot start, shot end, capture time at shot start] must match the Rec shots in Demo.tsx.
const inputShots = [
  ['c1-hero', 22.86, 38.82, 0],
  ['c2-studio', 38.82, 46.35, 0],
  ['c2-studio', 53.9, 68.45, 53.9 - 38.82],
  ['c2-studio', 73.6, 84.42, 73.6 - 38.82],
  ['c4-decide', 100.38, 111.78, 0],
];
for (const [name, t0, t1, from] of inputShots) {
  const meta = JSON.parse(
    readFileSync(path.join(root, 'public', 'media', 'capture', `${name}.json`), 'utf8'),
  );
  for (const m of meta.marks) {
    const t = +(t0 + m.frame / meta.fps - from).toFixed(3);
    if (t < t0 || t >= t1) continue;
    if (m.label === 'click' || m.label === 'grab') sfx.push({ t, name: 'click', gain: -13 });
    else if (m.label === 'key') sfx.push({ t, name: 'key', gain: -15 });
  }
}

// A felt-tip swipe as each highlight ring draws on (ring start times in Demo.tsx).
for (const t of [
  45.1,
  59.5,
  109.7,
  moments.flags - 0.05,
  moments.flags + 0.35,
  moments.flags + 0.75,
  moments.nextDoor - 0.2,
  moments.specs - 0.1,
  moments.steering - 0.1,
  moments.agents - 0.1,
  moments.hooks - 0.05,
  moments.tests - 0.1,
  moments.secrets - 0.1,
  moments.nothing - 0.1,
]) {
  sfx.push({ t: +t.toFixed(3), name: 'marker', gain: -15 });
}
sfx.sort((a, b) => a.t - b.t);

const out = { fps: TIMELINE.fps, duration: TIMELINE.duration, captions, moments, sfx };
writeFileSync(path.join(root, 'src', 'events.json'), JSON.stringify(out, null, 1));
console.log(
  'captions',
  captions.reduce((n, c) => n + c.pages.length, 0),
  'pages · moments',
  Object.keys(moments).length,
  '· sfx',
  sfx.length,
);
console.log(
  Object.entries(moments)
    .map(([k, v]) => `${k}=${v.toFixed(2)}`)
    .join(' '),
);
