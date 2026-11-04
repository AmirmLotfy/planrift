# Design — Studio experience

## Layers

- `src/render/transforms.ts` — plan mm (y north) ↔ SVG (y down) and ↔ three.js metres (−z north).
- `src/render/planModel.ts` — pure: scene + analysis + selection → plan primitives (walls with
  openings, leaf, arc, furniture, labels, dimensions, footprints, strike markers, clearances).
- `src/render/cutawayModel.ts` — pure: scene + analysis → boxes, leaf pivot and angle, sweep mesh
  outline, highlight flags.
- `src/state/store.ts` — zustand: ProjectState, active scenario, selection, drag preview, UI
  state; actions wrap domain functions; persistence subscriber.
- Components: `workspace/` (shell, header, panels), `plan/` (PlanView, HingeMap), `cutaway/`
  (Cutaway, lazy), `landing/`, `ui/` (Button, StatusBadge, Dialog, Field).

## Workspace layout

Desktop grid: header 56 px; left rail 248 px; centre 1fr (plan above cutaway); right column
380 px; status/timeline bar at the bottom. Tablet and mobile collapse as in the master plan §F.

## Interaction design

- Drag: pointer capture on the door handle; position projected onto the wall; snapped to 10 mm
  (Alt: 1 mm); preview updates analysis live; release commits one undo step.
- Keyboard on focused handle: ←/→ 10 mm, Shift 100 mm, Alt 1 mm; Enter selects; Esc cancels drag.
- Undo/redo: ⌘Z / ⇧⌘Z (Ctrl on other platforms) when focus is not in a text field.

## Visual language

Tokens and drawing conventions in `.kiro/steering/design-system.md`. Status badges pair colour,
icon and label. Conflict footprint: coral hatch; near: copper dashed; pass: evergreen dimension.
