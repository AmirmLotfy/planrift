# Geometry and revision test evidence

Observed on the development machine (macOS arm64, Node 22.13.1, Vitest 5.1.0).

| Date | Command | Result |
|---|---|---|
| 2026-11-08 04:54 EET | `npm run test:domain` (`vitest run tests/domain`) | 3 files, 75 tests passed, 0 failed |

What the three files cover (their `describe` blocks):

- `tests/domain/separation.test.ts`: the hand-computed flagship oracle (GEOMETRY_CONTRACT §7), exact
  predicates, agreement with the independent oracles in `tests/domain/oracles.ts` (property-based,
  fast-check), sweep measurements.
- `tests/domain/analysis.test.ts`: the Aster House seed, the flagship demonstration sequence, room
  isolation, the hinge position map, metamorphic invariance.
- `tests/domain/revision.test.ts`: diff, document impact ledger, edits with undo and redo, review
  lifecycle, comparison, project files, CSV.

The render agreement tests (`tests/render/`) run with the full suite, recorded in
`2026-11-04-verification.md`.
