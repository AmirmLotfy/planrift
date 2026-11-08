// Collects capture metadata (frame counts, cursor paths, marks) into src/captures.json for the
// edit, and copies the exact-predicate source excerpt used in the "geometry engine" panel.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'public', 'media', 'capture');
const out = {};
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const m = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
  if (!existsSync(path.join(dir, `${m.name}.mp4`))) continue;
  out[m.name] = { frames: m.frames, cursor: m.cursor, marks: m.marks, boxes: m.boxes ?? {} };
}
writeFileSync(path.join(root, 'src', 'captures.json'), JSON.stringify(out));
console.log(
  'captures:',
  Object.entries(out)
    .map(([k, v]) => `${k}(${v.frames})`)
    .join(' '),
);

// Real source, quoted verbatim: the exact integer predicate behind every status.
const src = readFileSync(path.join(root, '..', 'src', 'domain', 'geometry', 'separation.ts'), 'utf8').split(
  '\n',
);
const start = src.findIndex((l) => l.startsWith('function compareCandidate'));
const excerpt = src.slice(start, start + 10).join('\n');
writeFileSync(
  path.join(root, 'src', 'excerpt.json'),
  JSON.stringify({ file: 'src/domain/geometry/separation.ts', line: start + 1, code: excerpt }),
);
console.log(excerpt);
