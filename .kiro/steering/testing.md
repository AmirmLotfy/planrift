---
inclusion: fileMatch
fileMatchPattern: ["tests/**", "e2e/**", "**/*.test.ts", "**/*.test.tsx", "playwright.config.ts", "vitest.config.ts"]
---

# Test requirements

Incorrect geometry destroys trust, so tests are the primary evidence of correctness.

| Layer | Tool | Location | Gate |
|---|---|---|---|
| Domain math and revision model | Vitest + fast-check | `tests/domain/` | every geometry/revision change |
| Render models (2D/3D agreement) | Vitest | `tests/render/` | every render change |
| Components | Vitest + Testing Library (jsdom pragma) | `tests/components/` | interaction logic |
| Judge flow, persistence, exports | Playwright | `e2e/` | before deploy |
| Accessibility | @axe-core/playwright | `e2e/a11y.spec.ts` | before deploy |
| Visual review | Playwright screenshots, inspected by a person/agent | `docs/evidence/visual/` | before release |

## Rules

- Do not copy production formulas into expectations. Use hand arithmetic or the independent
  oracles in `tests/domain/oracles.ts`.
- Property tests state the property in the test name.
- E2E tests drive the real UI (inputs, drag, keyboard) and assert on visible, computed output.
- Every judge-demo action must change application state and be asserted.
- Record results in `docs/evidence/` (command, date, pass/fail counts). Never claim a pass that
  was not observed.
- No watch mode from the agent: `npx vitest run`, `npx playwright test`.
