# Implementation Plan — Quality assurance

- [x] 1. PLR-02-04 Playwright and axe setup; install Chromium
  - Status: Done (`playwright.config.ts`, desktop and phone projects, `@axe-core/playwright`)
  - _Requirements: 1.3, 2.1_

- [x] 2. PLR-06-01 Render agreement tests (2D vs 3D vs canonical)
  - Status: Tested (`tests/render/agreement.test.ts`)
  - _Requirements: 1.2_

- [x] 3. PLR-12-01 Judge flow e2e test (master plan §K)
  - Status: Tested (`e2e/judge-flow.spec.ts`, 13 passed and 1 skipped on 2026-11-04)
  - _Requirements: 1.3_

- [ ] 4. PLR-13-02 E2E: drag, keyboard, persistence, export/import, import errors
  - _Requirements: 1.4_

- [ ] 5. PLR-13-03 Accessibility checks in each state; keyboard-only flow
  - _Requirements: 2.1, 2.2_

- [ ] 6. PLR-14-01 Visual QA matrix, inspection report, fixes, re-shoot
  - _Requirements: 3.1_

- [ ] 7. PLR-13-04 Security review: headers, dependency audit, secret scan
  - _Requirements: 4.1, 4.2_
