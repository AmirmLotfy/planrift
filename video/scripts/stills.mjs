// Renders preview stills of the edit at given times (bundles once). Usage:
//   node scripts/stills.mjs 5 12 31.5 …          → out/check/t-<sec>.jpg (1280×720)
//   node scripts/stills.mjs --thumbs             → out/thumb-youtube.jpg, out/thumb-devpost.jpg
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { webpackOverride } from './webpack.mjs';

const root = path.resolve(import.meta.dirname, '..');
const browserExecutable = path.join(
  root,
  '..',
  '.kiro-cache',
  'pw-browsers',
  'chromium_headless_shell-1248',
  'chrome-headless-shell-mac-arm64',
  'chrome-headless-shell',
);
const serveUrl = await bundle({
  entryPoint: path.join(root, 'src', 'index.ts'),
  webpackOverride,
  publicDir: path.join(root, 'public'),
});
const args = process.argv.slice(2);
mkdirSync(path.join(root, 'out', 'check'), { recursive: true });

if (args[0] === '--thumbs') {
  for (const [id, file, format] of [
    // JPEG keeps both under the upload limits (YouTube 2 MB, Devpost 5 MB) at 2× resolution.
    ['ThumbYouTube', 'thumb-youtube.jpg', 'jpeg'],
    ['ThumbDevpost', 'thumb-devpost.jpg', 'jpeg'],
  ]) {
    const composition = await selectComposition({ serveUrl, id, browserExecutable });
    await renderStill({
      composition,
      serveUrl,
      output: path.join(root, 'out', file),
      imageFormat: format,
      jpegQuality: 92,
      scale: 2,
      browserExecutable,
    });
    console.log('✓', file);
  }
} else {
  const composition = await selectComposition({ serveUrl, id: 'PlanriftDemo', browserExecutable });
  for (const a of args) {
    const sec = Number(a);
    const frame = Math.min(composition.durationInFrames - 1, Math.round(sec * 30));
    await renderStill({
      composition,
      serveUrl,
      frame,
      output: path.join(root, 'out', 'check', `t-${a}.jpg`),
      imageFormat: 'jpeg',
      jpegQuality: 85,
      scale: 0.5,
      browserExecutable,
    });
    console.log('✓', a);
  }
}
