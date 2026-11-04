# PLANRIFT — Build Status

Resume point for any new Kiro session. Update at every phase boundary. Evidence lives in
`docs/evidence/`. Statuses: Planned · In progress · Implemented · Tested · Verified · Released.

Last updated: 2026-11-04

## Decisions (user-confirmed 2026-11-04)

- Hosting: Vercel + GitHub. Repo private during build, public at release after a secret scan and
  explicit approval. The user runs `vercel login` and `gh auth login` personally.
- Video: the user records the voiceover; Kiro prepares the script, shot list and captions.
- Research: proceed with defaults; recheck Navisworks / Revit / Bluebeam / Rayon in a real browser.
- Approval required before: public deploy, repo creation/publication, video upload, Devpost submit,
  any spending or account-level change.

## Toolchain (verified on this machine)

Node 22.13.1 · npm 10.9.2 · git 2.50.1 · gh 2.92.0 · vercel 48.4.0 · macOS 26.6.2 arm64.
Pinned: next 16.4.5 · react 19.3.1 · three 0.187.0 · @react-three/fiber 9.8.2 · drei 10.7.9 ·
zod 4.6.7 · zustand 5.0.16 · typescript 6.0.3 (typescript-eslint requires < 6.1) · eslint 9.39.5
(plugins cap at v9) · vitest 5.1.0 · vite 8.3.5 · fast-check 4.10.2 · @playwright/test 1.64.1 ·
jsdom 26.1.0 (jsdom 30 needs Node >= 22.22).

## Progress

| Phase | Status | Evidence |
|---|---|---|
| 00 Research | Implemented | Kiro docs + Kiroween page verified 2026-11-04; Devpost rules page returns 403 to the fetcher |
| 02 Foundation | In progress | package.json, tsconfig, next/vitest/eslint configs |
| 03 Geometry engine | Tested | `tests/domain/separation.test.ts`, `tests/domain/analysis.test.ts` (46 passing) |
| 04 Revision model | In progress | |
