# PLANRIFT — Design direction v4: "The white model"

Status: authoritative. Replaces v2 (revision sheet, cream) and v3 (dark modelspace), which both
read as generic templates. Light only. Tokens live in `src/app/globals.css` and
`src/render/palette.ts`; nobody else defines colours.

## Why v2 and v3 failed

- The product was shown as a picture inside a frame. The landing never let you touch the model.
- Sections were cards and tables with large empty areas. v3's scroll section left half the screen blank.
- Dark mode had no reason; it read as "AI dev tool".
- The studio was a stack of equal panels around a small plan; nothing told you where to look.

## Concept

Architects test ideas on a **white study model** — matte, lit by soft daylight, marked up in red
pen. PLANRIFT's two real artifacts are the **model** (3D) and the **drawing** (2D). They are the
visual material of the whole product. Interface chrome is quiet paper around them.

Signature moments (all computed live by the engine, nothing pre-rendered):

1. The hero is the model. It assembles on load (walls rise, furniture settles, the door swings),
   and you drag door D-101 along the wall. The swing turns redline on the console when it clashes.
2. Scrolling moves the camera from axonometric to straight down, and the solid model dissolves into
   the line drawing: plan and 3D are visibly one model.
3. The drawings that must be reissued rise out of the plan as sheets with a highlighter swipe.
4. The header carries a live status capsule of the model and a dimension-line scroll gauge.
5. The footer is a drawing title block with a revision table.

## Colour (light only; each hue has exactly one meaning)

| Token | Hex | Meaning |
|---|---|---|
| `--paper` | #F6F6F3 | page ground; the "table" the model sits on |
| `--sheet` | #FFFFFF | surfaces: panels, inputs, documents |
| `--model` | #F8F8F4 | 3D model material (walls, slab) |
| `--model-2` | #ECEBE5 | 3D furniture material (one step darker, so objects separate) |
| `--ink` | #111315 | text, linework |
| `--ink-2` | #4A5057 | secondary text |
| `--ink-3` | #6A7076 | tertiary text, dimension text |
| `--rule` | #E3E4DF | hairlines |
| `--rule-2` | #CFD1CB | stronger rules, input borders |
| `--grip` | #2F5BFF | interaction only: handles, selection, focus, primary action |
| `--redline` | #FF4A1C | conflict and change only (architects' red pen) |
| `--pass` | #0E9F5A (text #0A7A45) | verified pass only |
| `--amber` | #E8A600 (text #7A5600) | near-clearance / contact advisory only |
| `--highlighter` | #FFE14D | a document needs a human (drawn like a highlighter swipe) |

No gradients, no glow, no dark sections, no purple. Shadows only on floating overlays above a
canvas (header, model instrument, dialogs) — never on content cards.

## Type

- **Instrument Sans** (variable, wdth 75–100, wght 400–700) for everything human.
- **IBM Plex Mono** for every number with a unit, every ID (D-101, F-07, A-101), every coordinate.
- Scale (desktop): display 88–112 / 600 / -0.04em · h2 48–56 / 600 / -0.03em · h3 22 / 600 ·
  body 17 / 1.55 · UI 14 · small 13 · micro mono 11. Mobile display 44–52.
- Numbers use tabular figures.

## Shape and space

- 12-column grid, max 1440 px, gutter 24 px, page inset clamp(16px, 4vw, 48px).
- Radii: controls 8 px, floating panels 14 px, chips 6 px, documents 2 px (paper).
- Section rhythm: 120–160 px desktop, 72–96 px mobile. **Every section has a full-width centrepiece**
  (model, interactive ruler, comparison sheet, document stack). No text-only sections, no half-empty rows.

## Motion

- Easing `cubic-bezier(.16,1,.3,1)`; durations 450–900 ms; stagger ≤ 70 ms.
- Model intro ≤ 1.6 s; camera moves are damped, scroll-scrubbed, never on a timer.
- Reveal: text rises 24 px with opacity; rules draw (scaleX); highlighter swipes left→right.
- `prefers-reduced-motion`: no intro, no damping, camera jumps between fixed poses, no scrubbing,
  content fully visible.

## Accessibility and fallbacks

- Every drag has a slider and keyboard alternative. Live status in an `aria-live` region.
- No WebGL → the SVG plan from the same engine replaces the model; nothing else changes.
- Contrast ≥ 4.5:1 for text (grip on white 5.3:1, redline-ink on white 4.9:1, pass-ink 5.2:1).

## Studio (/demo)

A light, professional design tool. One focal canvas; inspector tells you the consequence first.
Top bar · left layers (collapsible) · canvas (Plan | Split | Model) with a consequence banner ·
inspector (Selection → Position → Result → Documents → Decision) · timeline. Mobile: canvas on top,
bottom sheet with tabs (Position · Result · Documents · Decision), sticky status strip.

## Do not

Dark mode · gradients · glow · glass on content · bento · three equal feature cards · pill badges
everywhere · mono eyebrow labels over every heading · stock photos · fake metrics · empty sections.
