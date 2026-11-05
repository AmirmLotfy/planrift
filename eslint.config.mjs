import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Architecture boundary: the domain engine must stay framework-free so it can be
    // tested without a browser, React, or WebGL.
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'src/domain must not import React.' },
            { group: ['three', 'three/*', '@react-three/*'], message: 'src/domain must not import Three.js.' },
            { group: ['next', 'next/*'], message: 'src/domain must not import Next.js.' },
            { group: ['@/components/*', '@/state/*', '@/app/*'], message: 'src/domain must not depend on UI layers.' },
          ],
        },
      ],
    },
  },
  {
    // react-three-fiber scene code: the frame loop mutates three.js objects and shared
    // animation state by design (useFrame), which the React Compiler rules cannot model.
    // Everything outside src/components/scene keeps the full rule set.
    files: ['src/components/scene/**/*.tsx'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'docs/**',
  ]),
]);

export default eslintConfig;
