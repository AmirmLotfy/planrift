---
inclusion: fileMatch
fileMatchPattern: ["src/app/**", "src/components/**", "src/render/**", "**/*.css"]
---

# Visual design system

PLANRIFT should look like a precise, editorial architecture tool: calm surfaces, drawing-quality
line work, and one strong semantic accent at a time. Not a SaaS analytics dashboard.

## Tokens (defined in `src/app/globals.css`, mirrored for SVG export in `src/render/palette.ts`)

| Token | Value | Use |
|---|---|---|
| `--canvas` | #F4F2EC | app background, drawing paper |
| `--ink` | #202B31 | text, wall poché, primary lines |
| `--mineral` | #7D8785 | secondary text, dimension lines |
| `--blueprint` | #31566F | selection, sweep, interactive accent |
| `--stone` | #DDD9CF | panels borders, furniture fill |
| `--copper` | #A8784E | REVIEW_REQUIRED, near clearance |
| `--coral` | #CA6758 | CONFLICT |
| `--evergreen` | #377467 | PASS |
| `--grid` | #D8DDD8 | fine drawing grid |

Status colour is never the only signal: every status also has an icon, a text label and, in
drawings, a pattern (hatch for conflict, dashed for near clearance).

## Typography

Geist Sans for UI, Geist Mono for dimensions, IDs and coordinates. Element IDs (D-101, F-07,
A-101) are always monospace. Minimum UI text 12 px; drawing labels scale with the plan but are
never below 11 px at the default zoom.

## Layout rules

- Desktop workspace: header, left element tree, centre plan (primary) with 3D cutaway, right
  inspector/analysis column, bottom timeline. Progressive disclosure over crowding.
- Tablet: plan full width, panels stack below. Mobile: inspection and comparison only; editing
  controls are labelled "desktop editing".
- 8 px spacing scale; 1 px hairlines in `--stone`; radius 6 px; no heavy shadows, no glows, no
  gradients behind content, no glassmorphism.

## Drawing conventions

Walls as solid ink poché; door leaf drawn open with a thin swing arc; furniture as stone fill with
ink outline; dimension strings in mono; selected element in blueprint; conflict footprint in
coral hatch; the strike point marked with a small circle and angle label.
