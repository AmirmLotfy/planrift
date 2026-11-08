// Timeline cues shared by the capture, mix and edit: where each voiceover line and word lands.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
export const TIMELINE = JSON.parse(readFileSync(path.join(root, 'src', 'timeline.json'), 'utf8'));
export const LINES = JSON.parse(readFileSync(path.join(root, 'build', 'vo-lines.json'), 'utf8'));

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Final-timeline time (s) at which `word` (nth match, 0-based) of a line starts. */
export function wordTime(lineId, word, nth = 0) {
  const line = LINES.find((l) => l.id === lineId);
  if (!line) throw new Error(`no line ${lineId}`);
  const hits = line.words.filter((w) => norm(w.text) === norm(word));
  const w = hits[nth];
  if (!w) throw new Error(`no word "${word}" in ${lineId}`);
  return TIMELINE.vo[lineId] + (w.start - line.start);
}

export function lineSpan(lineId) {
  const line = LINES.find((l) => l.id === lineId);
  const start = TIMELINE.vo[lineId];
  return [start, start + (line.end - line.start)];
}
