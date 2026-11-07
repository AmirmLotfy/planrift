# Verification record, 2026-11-04

Observed on the development machine (macOS arm64, Node 22.13.1). Nothing here is claimed beyond what was run.

| Check | Command | Result |
|---|---|---|
| Type check | `npx tsc --noEmit` | 0 errors |
| Lint | `npx eslint . --quiet` | 0 errors |
| Unit tests | `npx vitest --run` | 4 files, 83 tests passed |
| Production build | `NEXT_DIST_DIR=.next-e2e next build` | succeeded: `/`, `/demo` |
| E2E + axe | `npx playwright test` (desktop 1440×900, phone 390×844) | 13 passed, 1 skipped (Model↔Plan switch is desktop-only) |

E2E asserts, against the running production server: hero model present and no console errors; landing
slider at 3,000 mm shows a conflict and at 2,400 mm a pass; studio Revision A shows 15.7° and 188.7 mm,
Revision B 391.5 mm; hinge 5,400 mm reports "250 mm beyond"; Model view switching raises no errors; axe
(WCAG 2.0/2.1/2.2 A and AA tags) reports no serious or critical violations on `/` and `/demo`.

## Not verified

- Frame rate on real GPUs (headless runs use software rendering).
- Safari and Firefox.
- The no-WebGL fallback has not been exercised in a browser.
- Full WCAG conformance needs manual testing with assistive technologies and expert review.

## Fixed during this run

- Text contrast: `--ink-3` darkened from #858B91 to #6A7076 (4.6:1 on `--paper`).
- A removed 3D cutaway used drei `<Html>`, which caused an unmount crash; the studio now uses the white model.
