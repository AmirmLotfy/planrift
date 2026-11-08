// Final mix with ffmpeg: voiceover lines placed on the timeline, music ducked under the voice
// (sidechain), synthesised effects, then two-pass loudness to −14 LUFS / −1.5 dBTP (YouTube).
// Output: public/media/mix.wav (48 kHz stereo).
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const timeline = JSON.parse(readFileSync(path.join(root, 'src', 'timeline.json'), 'utf8'));
const events = JSON.parse(readFileSync(path.join(root, 'src', 'events.json'), 'utf8'));
const D = timeline.duration;

const inputs = [path.join(root, 'inbox', 'music.mp3')];
const graph = [];
const ms = (t) => Math.max(0, Math.round(t * 1000));

// Voice bus
const voIds = Object.keys(timeline.vo);
voIds.forEach((id) => {
  inputs.push(path.join(root, 'public', 'media', 'vo', `${id}.wav`));
  const i = inputs.length - 1;
  graph.push(
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${ms(timeline.vo[id])}:all=1[v${i}]`,
  );
});
const vLabels = voIds.map((_, k) => `[v${k + 1}]`).join('');
graph.push(`${vLabels}amix=inputs=${voIds.length}:normalize=0:dropout_transition=0,apad=whole_dur=${D}[vo]`);
graph.push(`[vo]asplit=2[voOut][voKey]`);

// Music: −7 dB overall, gentle high-shelf dip where the voice lives, ducked ~8 dB while speaking.
const fadeStart = timeline.music.fadeOutStart;
graph.push(
  `[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=-7dB,equalizer=f=2600:t=q:w=1.4:g=-2.5,afade=t=out:st=${fadeStart}:d=${(D - fadeStart).toFixed(2)},apad=whole_dur=${D}[mus]`,
);
graph.push(
  `[mus][voKey]sidechaincompress=threshold=0.015:ratio=5:attack=35:release=700:knee=6:makeup=1[musDuck]`,
);

// Effects bus
const sfxLabels = [];
events.sfx.forEach((cue) => {
  inputs.push(path.join(root, 'public', 'media', 'sfx', `${cue.name}.wav`));
  const i = inputs.length - 1;
  graph.push(
    `[${i}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${cue.gain}dB,adelay=${ms(cue.t)}:all=1[s${i}]`,
  );
  sfxLabels.push(`[s${i}]`);
});
graph.push(
  `${sfxLabels.join('')}amix=inputs=${sfxLabels.length}:normalize=0:dropout_transition=0,volume=-3dB,apad=whole_dur=${D}[sfx]`,
);

graph.push(
  `[voOut][musDuck][sfx]amix=inputs=3:normalize=0:dropout_transition=0,atrim=0:${D},alimiter=limit=0.95:level=disabled[mix]`,
);

const pre = path.join(root, 'build', 'mix-pre.wav');
const args = ['-y', '-v', 'error'];
for (const f of inputs) args.push('-i', f);
args.push('-filter_complex', graph.join(';'), '-map', '[mix]', '-ar', '48000', '-c:a', 'pcm_s24le', pre);
execFileSync('ffmpeg', args, { stdio: 'inherit' });

// Two-pass loudness normalisation.
const probe = execFileSync(
  'sh',
  [
    '-c',
    `ffmpeg -hide_banner -nostats -i "${pre}" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`,
  ],
  { encoding: 'utf8' },
);
const m = JSON.parse(probe.slice(probe.lastIndexOf('{'), probe.lastIndexOf('}') + 1));
const out = path.join(root, 'public', 'media', 'mix.wav');
execFileSync('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-i',
  pre,
  '-af',
  `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,aresample=48000`,
  '-ar',
  '48000',
  '-c:a',
  'pcm_s16le',
  out,
]);
const check = execFileSync(
  'sh',
  ['-c', `ffmpeg -hide_banner -nostats -i "${out}" -af ebur128=peak=true -f null - 2>&1`],
  { encoding: 'utf8' },
);
const summary = check.slice(check.lastIndexOf('Summary:'));
console.log(
  'input',
  m.input_i,
  'LUFS →',
  /I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1],
  'LUFS, true peak',
  /Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1],
  'dBFS',
);
console.log(
  'duration',
  execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], {
    encoding: 'utf8',
  }).trim(),
  's',
);
