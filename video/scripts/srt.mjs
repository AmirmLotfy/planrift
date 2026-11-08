// Writes YouTube captions (SRT) for the final cut from the same word timings as the burned-in
// captions, including the two lines that appear only as on-screen type in the video.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const events = JSON.parse(readFileSync(path.join(root, 'src', 'events.json'), 'utf8'));
const out = path.join(root, '..', 'docs', 'submission', 'captions.srt');

const stamp = (s) => {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)},${pad(ms % 1000, 3)}`;
};

// Pages are short phrases; join neighbours within a line into cues of at most ~42 characters per row.
const cues = [];
for (const line of events.captions) {
  let cur = null;
  for (const p of line.pages) {
    const text = p.words.map((w) => w.text).join(' ');
    if (cur && (cur.text + ' ' + text).length <= 76 && p.start - cur.end < 0.6) {
      cur.text += ' ' + text;
      cur.end = p.end;
    } else {
      if (cur) cues.push(cur);
      cur = { start: p.start, end: p.end, text };
    }
  }
  if (cur) cues.push(cur);
}

const wrap = (text) => {
  if (text.length <= 42) return text;
  const words = text.split(' ');
  let best = text;
  let bestDiff = Infinity;
  // Most balanced two-row split (cues are capped above so both rows stay near 42 characters).
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      best = `${a}\n${b}`;
      bestDiff = diff;
    }
  }
  return best;
};

const srt = cues
  .map((c, i) => {
    const next = cues[i + 1];
    const end = Math.min(c.end + 0.5, next ? next.start - 0.04 : c.end + 0.5);
    return `${i + 1}\n${stamp(c.start)} --> ${stamp(end)}\n${wrap(c.text)}\n`;
  })
  .join('\n');
writeFileSync(out, srt);
console.log(`${cues.length} cues → ${path.relative(path.join(root, '..'), out)}`);
