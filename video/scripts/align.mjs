// Aligns the known script to the whisper transcript (word level) and to detected silences, then
// writes build/vo-lines.json: each line's start/end in VO.wav and per-word times for captions.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SCRIPT } from './script.mjs';

const root = path.resolve(import.meta.dirname, '..');
const transcript = JSON.parse(readFileSync(path.join(root, 'build', 'transcript.json'), 'utf8'));

const norm = (w) =>
  w
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/metre/g, 'meter')
    .replace(/maths$/, 'math');

// Transcript words from DTW token times. whisper.cpp's t_dtw (centiseconds) marks where a token
// ends; segment offsets are unreliable. Tokens without a leading space continue the previous word
// (sub-words, contractions); punctuation tokens point at the next onset, so they are ignored.
const tw = [];
for (const seg of transcript.transcription) {
  for (const tok of seg.tokens) {
    if (tok.text.startsWith('[_') || tok.t_dtw < 0) continue;
    const isPunct = /^[.,:;!?…-]+$/.test(tok.text.trim());
    if (isPunct) continue;
    const end = tok.t_dtw / 100;
    if (/^\s/.test(tok.text) || tw.length === 0) tw.push({ text: tok.text.trim(), end });
    else {
      tw[tw.length - 1].text += tok.text;
      tw[tw.length - 1].end = end;
    }
  }
}

// Script words with their line index (display text keeps punctuation).
const sw = SCRIPT.flatMap((line, li) =>
  line.text.split(/\s+/).map((display) => ({ display, key: norm(display), li })),
);

// Needleman–Wunsch alignment on normalised words.
const n = sw.length;
const m = tw.length;
const tkeys = tw.map((w) => norm(w.text));
const sim = (a, b) =>
  a === b ? 0 : a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a)) ? 0.3 : 1;
const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
const P = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
for (let i = 1; i <= n; i++) ((D[i][0] = i), (P[i][0] = 1));
for (let j = 1; j <= m; j++) ((D[0][j] = j), (P[0][j] = 2));
for (let i = 1; i <= n; i++)
  for (let j = 1; j <= m; j++) {
    const diag = D[i - 1][j - 1] + sim(sw[i - 1].key, tkeys[j - 1]);
    const up = D[i - 1][j] + 0.9;
    const left = D[i][j - 1] + 0.9;
    if (diag <= up && diag <= left) ((D[i][j] = diag), (P[i][j] = 0));
    else if (up <= left) ((D[i][j] = up), (P[i][j] = 1));
    else ((D[i][j] = left), (P[i][j] = 2));
  }
const match = new Array(n).fill(-1);
for (let i = n, j = m; i > 0 || j > 0;) {
  const p = P[i][j];
  if (i > 0 && j > 0 && p === 0) {
    match[i - 1] = j - 1;
    i--;
    j--;
  } else if (i > 0 && (j === 0 || p === 1)) i--;
  else j--;
}

// Silences in the original file.
const log = execFileSync(
  'ffmpeg',
  [
    '-hide_banner',
    '-nostats',
    '-i',
    path.join(root, 'inbox', 'VO.wav'),
    '-af',
    'silencedetect=noise=-42dB:d=0.2',
    '-f',
    'null',
    '-',
  ],
  {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  },
).toString();
const stderr = execFileSync(
  'sh',
  [
    '-c',
    `ffmpeg -hide_banner -nostats -i "${path.join(root, 'inbox', 'VO.wav')}" -af silencedetect=noise=-42dB:d=0.2 -f null - 2>&1`,
  ],
  { encoding: 'utf8' },
);
void log;
const silences = [];
let open = null;
for (const line of stderr.split('\n')) {
  const s = /silence_start: ([\d.]+)/.exec(line);
  const e = /silence_end: ([\d.]+)/.exec(line);
  if (s) open = Number(s[1]);
  if (e && open !== null) {
    silences.push([open, Number(e[1])]);
    open = null;
  }
}
const duration = Number(
  execFileSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(root, 'inbox', 'VO.wav')],
    { encoding: 'utf8' },
  ),
);

// Word starts. DTW end times can run up to ~0.3 s late, so a silence that ends after the previous
// word's (late) end still separates the two words: the previous word ends where the silence starts.
for (let j = 0; j < tw.length; j++) {
  const prevEnd = j > 0 ? tw[j - 1].end : 0;
  const gap = silences
    .filter(([gs, ge]) => ge > prevEnd - 0.3 && ge <= tw[j].end - 0.04 && gs < tw[j].end)
    .at(-1);
  if (gap) {
    tw[j].start = Math.max(gap[1], j > 0 ? Math.min(prevEnd, gap[0] + 0.05) : 0);
    if (j > 0) tw[j - 1].end = Math.min(prevEnd, gap[0] + 0.05);
  } else tw[j].start = prevEnd;
  if (tw[j].start >= tw[j].end) tw[j].start = Math.max(j > 0 ? tw[j - 1].end : 0, tw[j].end - 0.12);
}

// Word times for every script word (interpolate unmatched words between matched neighbours).
const times = sw.map((_, i) => (match[i] >= 0 ? { start: tw[match[i]].start, end: tw[match[i]].end } : null));
for (let i = 0; i < n; i++) {
  if (times[i]) continue;
  let a = i - 1;
  while (a >= 0 && !times[a]) a--;
  let b = i + 1;
  while (b < n && !times[b]) b++;
  const t0 = a >= 0 ? times[a].end : 0;
  const t1 = b < n ? times[b].start : duration;
  const k = b - a;
  times[i] = {
    start: t0 + ((t1 - t0) * (i - a - 1)) / k,
    end: t0 + ((t1 - t0) * (i - a)) / k,
    guessed: true,
  };
}

// Line bounds: each boundary is the longest silence between one line's last word and the next
// line's first word. Lines keep a short tail and lead-in around their speech.
const lines = SCRIPT.map((line, li) => {
  const idx = sw.map((w, i) => (w.li === li ? i : -1)).filter((i) => i >= 0);
  return {
    id: line.id,
    text: line.text,
    start: Math.max(0, times[idx[0]].start - 0.08),
    end: Math.min(duration, times[idx.at(-1)].end + 0.12),
    words: idx.map((i) => ({
      text: sw[i].display,
      start: times[i].start,
      end: times[i].end,
      guessed: Boolean(times[i].guessed),
    })),
  };
});
for (let i = 0; i + 1 < lines.length; i++) {
  const a = lines[i];
  const b = lines[i + 1];
  const lastEnd = a.words.at(-1).end;
  const firstEnd = b.words[0].end;
  const gap = silences
    .filter(([gs, ge]) => ge > lastEnd - 0.5 && gs < firstEnd)
    .sort((x, y) => y[1] - y[0] - (x[1] - x[0]))[0];
  if (!gap) throw new Error('no silence between ' + a.id + ' and ' + b.id);
  a.end = Math.min(gap[0] + 0.12, (gap[0] + gap[1]) / 2);
  b.start = Math.max(gap[1] - 0.08, (gap[0] + gap[1]) / 2);
  a.words.at(-1).end = Math.min(a.words.at(-1).end, gap[0] + 0.05);
  b.words[0].start = Math.max(b.words[0].start, gap[1]);
}
lines[0].start = 0;
lines.at(-1).end = duration;

for (let i = 1; i < lines.length; i++)
  if (lines[i].start < lines[i - 1].end) throw new Error(`overlap ${lines[i - 1].id}/${lines[i].id}`);
writeFileSync(path.join(root, 'build', 'vo-lines.json'), JSON.stringify(lines, null, 1));
const guessed = lines.flatMap((l) => l.words).filter((w) => w.guessed).length;
for (const l of lines)
  console.log(
    l.id,
    l.start.toFixed(2),
    '→',
    l.end.toFixed(2),
    `(${(l.end - l.start).toFixed(2)}s)`,
    l.text.slice(0, 48),
  );
console.log('words', sw.length, 'interpolated', guessed);
