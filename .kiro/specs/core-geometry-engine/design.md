# Design — Core geometry engine

## Modules

| Module | Responsibility |
|---|---|
| `src/domain/model/schema.ts` | zod schemas, canonical types, limits |
| `src/domain/geometry/frame.ts` | wall segments (CCW), door frames, exact plan↔local transforms |
| `src/domain/geometry/separation.ts` | eight-candidate signed separation, exact `compareSeparation`, `classifySeparation` |
| `src/domain/geometry/sweep.ts` | strike range, closed-form overlap area, footprint and sector outlines |
| `src/domain/analysis/analyze.ts` | door/furniture validity, pair evaluation, roll-ups, `analyzeScene` |
| `src/domain/analysis/hingeMap.ts` | per-millimetre status bands |
| `src/domain/analysis/explain.ts` | plain-language explanations from computed results |

## Key decisions

- **Door-local canonical frame.** All four walls and both handings map to one canonical case by
  an integer rotation or reflection, so one solver serves every configuration and metamorphic
  tests can check the mapping.
- **Support-function formulation.** Signed separation of convex sets via support functions gives
  distance and penetration depth in one formula; for a quarter disk against an axis-aligned
  rectangle it reduces to eight closed-form candidates (contract §4).
- **Exact predicates.** Status boundaries compare integer squares; floats only for display.
- **Fail closed.** Unsupported → UNSUPPORTED; invalid → INVALID; neither is evaluated as PASS.

## Data flow

`Scene → analyzeScene → SceneAnalysis { rooms[ doors[], furniture[], pairs[] ], status, issues }`

## Testing strategy

Hand oracle values (contract §7), independent oracles (`tests/domain/oracles.ts`: boundary
sampling distance, translation-search penetration depth, overlap predicate), properties
(Lipschitz, determinism, classification consistency, area cross-check, strike-angle leaf check),
metamorphic invariance (rotation, mirror, translation), isolation, hinge-map agreement.
