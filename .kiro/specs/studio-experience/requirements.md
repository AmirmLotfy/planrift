# Requirements — Studio experience (landing, workspace, 2D, 3D, panels, decisions)

## Introduction

The studio is the judge-facing product: a landing page and an anonymous `/demo` workspace where a
door change visibly propagates to the plan, the 3D cutaway, the analysis and the document ledger.
All values come from the domain engine. Judge flow: `docs/plan/MASTER_PLAN.md` §K.

## Requirement 1 — Landing page

1. THE System SHALL present the value proposition, the workflow, supported capabilities, explicit
   limitations, project information and a primary "Open interactive demo" action.
2. THE System SHALL show the real product (live render of the engine output), not fabricated
   screenshots.

## Requirement 2 — Workspace and plan

1. WHEN `/demo` opens, THE System SHALL load the Aster House project without an account.
2. THE System SHALL draw the plan to scale from the canonical scene: walls, door opening, leaf,
   swing arc, furniture with IDs, dimensions and a scale reference.
3. WHEN a pair conflicts, THE System SHALL draw the overlap footprint, the leaf at its first-strike
   angle and the strike point; WHEN it clears, THE System SHALL draw the governing clearance.
4. THE System SHALL show a hinge position map for the selected door.

## Requirement 3 — Editing

1. THE System SHALL let the user change the D-101 hinge position by number field, by dragging
   the door along its wall and by keyboard (10 mm, Shift 100 mm, Alt 1 mm).
2. WHEN the scene changes, THE System SHALL recompute and redisplay the analysis without an
   explicit analyse action.
3. IF an entered value is not a whole number of millimetres, THEN THE System SHALL show an inline
   error and keep the scene unchanged.
4. THE System SHALL provide undo, redo and discard controls with keyboard shortcuts.

## Requirement 4 — 3D cutaway

1. THE System SHALL render a 3D cutaway from the same scene and analysis, with the leaf at its
   maximum reachable opening and conflicting furniture highlighted.
2. THE System SHALL offer camera presets and orbit control, respect reduced motion, and show a
   fallback message when WebGL is unavailable while the 2D plan keeps working.

## Requirement 5 — Analysis and ledger panels

1. THE System SHALL explain what changed, what was tested, which IDs are involved, the result
   and its measurements, the model assumptions and what to verify manually.
2. THE System SHALL list documents requiring review with reasons and state that PLANRIFT has not
   modified them.
3. THE System SHALL announce analysis changes in a polite live region.

## Requirement 6 — Scenarios, comparison and decisions

1. THE System SHALL let the user create, name, switch and annotate scenarios.
2. THE System SHALL show a comparison of the source revision and scenarios with synchronised plans.
3. THE System SHALL guide submission, acceptance and rejection with the domain gates, and offer
   the resulting receipt and exports.

## Requirement 7 — Accessibility and responsiveness

1. THE System SHALL be operable by keyboard with visible focus, non-colour status indicators and
   labelled controls.
2. THE System SHALL provide full editing on desktop, adapted layouts on tablet and an inspection
   and comparison experience on mobile.
