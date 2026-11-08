// Voiceover processing: 48 kHz, gentle clean-up (high-pass, de-mud, presence, de-ess, light
// compression), level to −16 LUFS, then one file per line with short fades (no clicks).
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const lines = JSON.parse(readFileSync(path.join(root, 'build', 'vo-lines.json'), 'utf8'));
const outDir = path.join(root, 'public', 'media', 'vo');
mkdirSync(outDir, { recursive: true });

const chain = [
  'aresample=48000',
  'highpass=f=75',
  'equalizer=f=220:t=q:w=1.2:g=-1.5',
  'equalizer=f=3800:t=q:w=1:g=1.5',
  'deesser=i=0.35',
  'acompressor=threshold=-24dB:ratio=2.2:attack=6:release=140:makeup=1.6',
].join(',');
const processed = path.join(root, 'build', 'vo-48k.wav');
execFileSync('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-i',
  path.join(root, 'inbox', 'VO.wav'),
  '-af',
  chain,
  '-c:a',
  'pcm_s24le',
  processed,
]);

const measure = (file) => {
  const log = execFileSync(
    'sh',
    ['-c', `ffmpeg -hide_banner -nostats -i "${file}" -af ebur128 -f null - 2>&1`],
    { encoding: 'utf8' },
  );
  return Number(/I:\s+(-?[\d.]+) LUFS/.exec(log.slice(log.lastIndexOf('Summary:')))[1]);
};
const gain = -16 - measure(processed);
console.log('VO gain', gain.toFixed(2), 'dB');

for (const l of lines) {
  const d = l.end - l.start;
  execFileSync('ffmpeg', [
    '-y',
    '-v',
    'error',
    '-ss',
    l.start.toFixed(3),
    '-t',
    d.toFixed(3),
    '-i',
    processed,
    '-af',
    `volume=${gain.toFixed(2)}dB,alimiter=limit=0.84:attack=2:release=40:level=disabled,afade=t=in:d=0.015,afade=t=out:st=${(d - 0.04).toFixed(3)}:d=0.04`,
    '-c:a',
    'pcm_s24le',
    path.join(outDir, `${l.id}.wav`),
  ]);
}
console.log('lines', lines.length, '→', outDir);
