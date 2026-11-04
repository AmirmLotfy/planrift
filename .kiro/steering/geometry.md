---
inclusion: fileMatch
fileMatchPattern: ["src/domain/**", "tests/domain/**", "src/render/**"]
---

# Canonical geometry and computational correctness

The contract is `docs/geometry/GEOMETRY_CONTRACT.md`. Code must match it; change the contract
first (with reasoning) before changing behaviour.

#[[file:docs/geometry/GEOMETRY_CONTRACT.md]]

## Rules

- Inputs are safe integers in millimetres. The solver throws `RangeError` on anything else;
  schemas and edits reject such values before they reach it.
- Status decisions use `compareSeparation` (exact integer predicates). Floating-point values
  are for display only, rounded to 0.1 mm.
- `REVIEW_REQUIRED` is document-level only and never merged into geometric statuses.
- Unsupported concepts (non-90° swings, exterior swings, non-hinged operations, rotated or
  non-rectangular footprints) produce `UNSUPPORTED` pairs, never `PASS`.
- Never special-case scenario coordinates. Tests must cover arbitrary positions.

## Tests for any geometry change

1. Hand-computed oracle values (write the arithmetic in the test).
2. Property tests against the independent oracles in `tests/domain/oracles.ts`.
3. Metamorphic tests: rotation, mirroring, translation leave results unchanged.
4. Boundary tests at ±tolerance and the advisory threshold.
5. `npm run test:domain` must pass before a geometry task is marked complete.
