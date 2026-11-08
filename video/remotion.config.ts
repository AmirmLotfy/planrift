import path from 'node:path';
import { Config } from '@remotion/cli/config';

const here = process.cwd();
const repo = path.resolve(here, '..');

// Reuse the Chromium already installed for the app's Playwright tests (no second browser download).
Config.setBrowserExecutable(
  path.join(
    repo,
    '.kiro-cache',
    'pw-browsers',
    'chromium_headless_shell-1248',
    'chrome-headless-shell-mac-arm64',
    'chrome-headless-shell',
  ),
);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(3);
Config.setCodec('h264');
Config.setCrf(15);
Config.setPixelFormat('yuv420p');

// The opening drawing is computed by the app's own engine: '@/…' resolves to ../src, and its
// dependencies (zod, @noble/hashes) come from the app's node_modules. One React copy only.
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias ?? {}),
      '@': path.join(repo, 'src'),
      react: path.join(here, 'node_modules', 'react'),
      'react-dom': path.join(here, 'node_modules', 'react-dom'),
    },
    modules: [path.join(here, 'node_modules'), path.join(repo, 'node_modules'), 'node_modules'],
  },
}));
