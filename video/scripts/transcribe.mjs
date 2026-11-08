// Word-level timings for the voiceover, computed locally with whisper.cpp (no upload).
// Output: build/transcript.json (raw tokens with start/end in ms).
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { downloadWhisperModel, installWhisperCpp, transcribe } from '@remotion/install-whisper-cpp';

const root = path.resolve(import.meta.dirname, '..');
const whisperPath = path.join(root, '.whisper');
const input = path.join(root, 'build', 'vo-16k.wav');
mkdirSync(path.join(root, 'build'), { recursive: true });

execFileSync('ffmpeg', [
  '-y',
  '-v',
  'error',
  '-i',
  path.join(root, 'inbox', 'VO.wav'),
  '-ar',
  '16000',
  '-ac',
  '1',
  '-c:a',
  'pcm_s16le',
  input,
]);
await installWhisperCpp({ to: whisperPath, version: '1.5.5', printOutput: false });
await downloadWhisperModel({ model: 'medium.en', folder: whisperPath, printOutput: false });
const result = await transcribe({
  inputPath: input,
  whisperPath,
  model: 'medium.en',
  tokenLevelTimestamps: true,
  whisperCppVersion: '1.5.5',
  printOutput: false,
  additionalArgs: [['--max-len', '1']],
});
writeFileSync(path.join(root, 'build', 'transcript.json'), JSON.stringify(result, null, 1));
console.log('segments:', result.transcription.length);
