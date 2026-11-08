// Shared webpack override (also applied by remotion.config.ts for the CLI): '@/…' → the app's src,
// app dependencies resolvable, one React copy.
import path from 'node:path';

const here = path.resolve(import.meta.dirname, '..');
const repo = path.resolve(here, '..');

export const webpackOverride = (config) => ({
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
});
