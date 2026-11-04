# Requirements — Quality assurance

## Introduction

Incorrect geometric conclusions undermine the product, so verification is evidence-driven:
automated tests, accessibility checks and real-browser visual review, recorded in
`docs/evidence/`.

## Requirement 1 — Automated tests

1. THE System SHALL pass unit, property-based and metamorphic domain tests on every change to
   `src/domain`.
2. THE System SHALL pass render-agreement tests proving the 2D and 3D models place every element
   within 0.5 mm of the canonical geometry.
3. THE System SHALL pass an end-to-end test of the judge flow (master plan §K) in a production build.
4. THE System SHALL pass end-to-end tests for drag and keyboard editing, persistence across reload,
   export and re-import, and import error handling.

## Requirement 2 — Accessibility

1. THE System SHALL have zero serious or critical axe violations on `/` and on `/demo` in
   baseline, conflict and decision states.
2. THE System SHALL allow the judge flow to be completed with the keyboard alone.

## Requirement 3 — Visual QA

1. THE System SHALL be reviewed in a real browser at 1440×900, 1280×800, 1024×768 and 390×844
   for clipping, overlap, legibility and rendering defects, with screenshots and a defect log.

## Requirement 4 — Security

1. THE System SHALL serve the documented security headers in production.
2. THE System SHALL have no secrets in the git history before publication.
