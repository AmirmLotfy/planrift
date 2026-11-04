---
inclusion: always
---

# Structure, architecture boundaries and conventions

```
src/domain/        Pure TypeScript engine. No React, Three.js, Next.js, DOM or browser storage.
  geometry/        frame.ts (coordinate frames), separation.ts (solver), sweep.ts (angles, area, outlines)
  model/           schema.ts (zod, canonical types), lookup.ts
  analysis/        analyze.ts (statuses), hingeMap.ts, explain.ts
  revision/        diff.ts, impact.ts, scenario.ts (lifecycle), receipt.ts, compare.ts
  io/              canonical.ts (fingerprints), projectFile.ts (import/export), csv.ts, receiptHtml.ts
  seed/            asterHouse.ts (fictional sample project)
src/render/        Pure render models derived from (scene, analysis): plan + cutaway
src/state/         zustand store, persistence (calls domain functions only)
src/components/    React UI (plan/, cutaway/, workspace/, landing/, ui/)
src/app/           Next.js routes: / (landing), /demo (workspace)
tests/             Vitest: domain/, render/, components/
e2e/               Playwright judge-flow, accessibility, responsive
docs/              plan, geometry contract, decisions, evidence, submission
.kiro/             specs, steering, agents, hooks (tracked in git — never ignore)
```

## Boundaries (enforced by ESLint `no-restricted-imports` for src/domain)

1. The canonical scene is the single source of truth. The 2D plan, 3D cutaway, panels,
   comparison, receipts and exports all derive from `(scene, analyzeScene(scene))`.
2. Components never compute geometry or statuses. They call render-model builders or domain
   selectors. No duplicated coordinate math in components.
3. Rendering never mutates the scene. All edits go through `editScenario(...)` with an `Edit`.
4. Coordinates are integer millimetres in room-local space. Conversion to SVG / Three.js units
   happens only in `src/render/` transforms.

## Conventions

- Named exports; one concern per module; files kebab or camel case matching existing files.
- Functions return `Result<T>` (`{ ok, value } | { ok, error }`) instead of throwing for user errors.
- Throw only for programmer errors (non-integer input to the solver).
- Comments explain why, not what. Keep domain doc comments accurate to the math.
- Prettier: single quotes, semicolons, width 110.
- No new dependency without a one-line justification in `docs/architecture/DECISIONS.md`.
