# Verification record, 2026-11-08

Observed on the development machine (macOS arm64, Node 22.13.1). Nothing here is claimed beyond
what was run.

| Check | Command | Result |
|---|---|---|
| Type check, lint, unit tests, build | `npm run verify` | 0 type errors; 0 lint errors; 4 files, 83 tests passed; production build succeeded (`/`, `/demo`) |
| Domain tests | `npm run test:domain` | 3 files, 75 tests passed (`tests-domain.md`) |
| Demo video project | `cd video && npx tsc --noEmit -p tsconfig.json` | 0 errors |
| Demo video file | `ffprobe` / `ebur128` on `video/out/planrift-demo-1440p.mp4` | 168.0 s, 2560×1440, 30 fps, 5,040 frames; −14.1 LUFS integrated |

Changes since 2026-11-04 that these runs cover: ESLint now ignores `video/**` (a separate package
with its own type check); spec task lists updated to match finished work; demo video, captions and
submission copy added under `video/` and `docs/submission/`. The Playwright suite was not re-run
today; the app code is unchanged since the 2026-11-04 run.
