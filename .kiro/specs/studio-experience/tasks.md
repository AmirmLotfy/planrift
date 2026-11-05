# Implementation Plan — Studio experience

- [x] 1. PLR-02-03 App shell: routes, fonts, tokens, security headers
  - `/` and `/demo`, Instrument Sans + IBM Plex Mono (self-hosted), globals.css tokens, metadata, CSP headers
  - _Requirements: 1.1, 2.1_

- [x] 2. PLR-05-01 Render transforms and plan render model
  - Pure functions; tests in tests/render
  - _Requirements: 2.2, 2.3_

- [x] 3. PLR-05-02 PlanView: walls, opening, leaf, arc, furniture, labels, dimensions
  - _Requirements: 2.2_

- [x] 4. PLR-05-05 Conflict footprint, strike marker, clearance dimension
  - _Requirements: 2.3_

- [x] 5. PLR-05-03 / 05-04 Selection, element tree, hinge field, drag and keyboard editing
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 6. PLR-05-06 Hinge position map strip
  - _Requirements: 2.4_

- [x] 7. PLR-07-01 / 07-02 Analysis panel and live announcements
  - _Requirements: 5.1, 5.3_

- [x] 8. PLR-08-01 Impact ledger panel
  - _Requirements: 5.2_

- [x] 9. PLR-09-01 / 09-04 Scenario tabs, undo/redo/discard, timeline
  - _Requirements: 3.4, 6.1_

- [x] 10. PLR-06-01..03 3D white model (R3F) with presets, WebGL fallback, reduced motion
  - _Requirements: 4.1, 4.2_

- [x] 11. PLR-09-02 Comparison view
  - _Requirements: 6.2_

- [x] 12. PLR-09-03 Decision dialog, receipt and exports
  - _Requirements: 6.3_

- [x] 13. PLR-11-01 Landing page with live product preview and limitations
  - _Requirements: 1.1, 1.2_

- [x] 14. PLR-11-04 Responsive tablet and mobile layouts
  - _Requirements: 7.2_

- [x] 15. PLR-11-03 Import UI, error states, reset demo
  - _Requirements: 2.1, 6.3_
