# Design — Quality assurance

- Vitest projects by folder: `tests/domain` (node), `tests/render` (node), `tests/components`
  (jsdom pragma).
- Playwright (`playwright.config.ts`): `webServer` runs `npm run build && npm run start` on port
  3100; projects `desktop-chromium` (1440×900), `tablet` (1024×768), `mobile` (390×844);
  `PLAYWRIGHT_BASE_URL` overrides for the deployed URL.
- `e2e/judge-flow.spec.ts` follows master plan §K step by step and asserts visible text.
- `e2e/a11y.spec.ts` runs `@axe-core/playwright` in each state.
- `e2e/visual.spec.ts` captures the screenshot matrix into `docs/evidence/visual/` for human or
  agent inspection (not pixel-diffed in CI because fonts and GPUs vary).
- Evidence files: `docs/evidence/tests-*.md` with command, date, counts, failures.
