---
inclusion: always
---

# Tech stack and commands

Pinned exact versions (see `package.json`). Do not upgrade without a reason recorded in
`docs/architecture/DECISIONS.md`.

| Area | Choice | Note |
|---|---|---|
| Framework | Next.js 16.4.5 App Router, React 19.3.1 | Read `node_modules/next/dist/docs/` before using Next APIs; this version differs from older training data. |
| Language | TypeScript 6.0.3 strict, `noUncheckedIndexedAccess` | typescript-eslint requires TS < 6.1, so not TS 7. |
| Validation | zod 4.6.7 (`z.strictObject`, `z.int()`) | Every import and persisted state passes the schema. |
| State | zustand 5.0.16 | Thin wrapper over pure domain functions. |
| 2D | SVG rendered from a pure render model | No canvas libraries. |
| 3D | three 0.187, @react-three/fiber 9.8.2, @react-three/drei 10.7.9 | Lazy-loaded, client-only. |
| Hashing | @noble/hashes 2.4 (`sha2.js`) | Scene fingerprints. |
| Styling | CSS Modules + CSS custom properties in `src/app/globals.css` | No Tailwind. |
| Fonts | `geist` package (local files, no network) | |
| Tests | Vitest 5.1, fast-check 4.10, Testing Library, jsdom 26.1, Playwright 1.64, @axe-core/playwright | |
| Lint | ESLint 9.39 flat config with eslint-config-next 16.4.5 | Plugins cap at ESLint 9. |

Node: 22.13.1 locally (Vercel: Node 22.x). npm only.

## Commands

- `npm run dev` — dev server (run it yourself in a terminal; it does not exit)
- `npm run typecheck` · `npm run lint` · `npm run test` · `npm run test:domain`
- `npm run e2e` — Playwright (builds and starts the production server)
- `npm run verify:quick` — typecheck + domain tests (used by hooks)
- `npm run verify` — typecheck, lint, all unit tests, production build
- `npm run verify:release` — `verify` + e2e

Never run watch modes from the agent. Use `vitest run`.
