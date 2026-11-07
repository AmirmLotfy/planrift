# Devpost entry (copy-ready)

Review everything here before submitting. Nothing has been submitted.

**Project name:** PLANRIFT

**Tagline:** Know what a design revision breaks before it is issued.

**Category:** Frankenstein

**Try it:** https://planrift-omega.vercel.app (studio: /demo, no sign-in)
**Code:** https://github.com/AmirmLotfy/planrift (MIT; `.kiro/` included). It is private until you approve publishing.
**Video:** _add the YouTube URL once uploaded_

## Inspiration

A door that moves 1.3 metres looks harmless on a plan. Whether its swing hits the console behind it, and
which drawings and schedules now disagree with the plan, is usually found out by hand, late, in review.
We wanted that answer before the revision is issued.

## What it does

PLANRIFT is a revision rehearsal studio for simplified room geometry. In a fictional hotel project you
move door D-101 along its wall and the engine recomputes everything:

- **Swing against furniture, in whole millimetres.** Revision A (hinge at 3,000 mm) strikes console F-07
  after 15.7° and intrudes 188.7 mm. Revision B (2,400 mm) clears it by 391.5 mm.
- **A hinge map.** The result at every millimetre the door could sit, drawn along the wall.
- **Documents that need a person.** A-101, A-401 and D-01 are flagged for review whenever D-101 changes.
  PLANRIFT never edits them, and the unrelated sheet for room 513 stays unflagged.
- **Two views of one model.** An interactive WebGL study model and the 2D plan come from the same scene,
  so they cannot disagree. Drag the door in either.
- **Compare and decide.** Branch scenarios from the approved plan, compare them side by side, accept or
  reject with an acknowledgement of the flagged sheets, and export a receipt (JSON or printable HTML).

It does not claim code compliance, approval to build, CAD/BIM import, or automatic drawing updates.
Rotated furniture, sliding doors and non-90° swings are reported as Unsupported, never guessed.

## Why Frankenstein

PLANRIFT stitches parts that normally live in separate tools into one loop: a CAD-style plan editor, a
computational-geometry engine, a live WebGL room, a revision diff and versioning model, a document
dependency ledger and an audit receipt. One edit flows through all of them at once. The stitching is
functional (one scene, one analysis, many consumers), not a list of libraries.

## How we built it

- **Engine** (`src/domain`, pure TypeScript, no React): a signed-separation solver between a quarter-disc
  swing and rectangles, with status decisions made by exact integer predicates. Floats are display-only.
  The contract with hand-computed numbers is `docs/geometry/GEOMETRY_CONTRACT.md`.
- **Render models** derive both the SVG plan and the 3D scene from `(scene, analysis)`; tests check that
  the two agree.
- **Next.js 16 / React 19**, React Three Fiber for the white model, Lenis and GSAP for the scroll story.
  No third-party requests at runtime: no analytics, remote fonts or environment maps.
- **Verification:** 83 unit and property tests (independent oracles, metamorphic checks, boundary cases at
  the tolerance), 13 Playwright checks on desktop and phone, and axe accessibility checks on both pages.

## How we used Kiro

- **Specs** (`.kiro/specs`): five specs with requirements, design and tasks (geometry engine, revision
  workflow, studio, quality, release). The geometry engine was written against the contract first.
- **Steering** (`.kiro/steering`): nine files. Product, tech, structure and security are always on;
  geometry, design-system, accessibility and testing load when matching files are read; release is manual.
- **Custom agents** (`.kiro/agents`): seven (geometry, frontend, 3D, design, QA, release, architecture
  review), each with its own scope and tools.
- **Hooks** (`.kiro/hooks`): six. They gate task completion on typecheck, lint and tests, re-run the
  geometry tests when engine files change, block credential-like writes, and ask before any deploy, push or
  publish. They shaped the build: the agent could not ship a status the tests disagreed with.
- Kiro also drove research, implementation, visual QA loops and the deployment preparation, with a person
  approving every public action.

## Challenges

- Making "exact" mean exact: statuses cannot flicker at a boundary, so the status bands are decided with
  integer predicates and checked at the tolerance edges.
- Keeping 2D and 3D in agreement without duplicating geometry in components.
- Our first interface passed tests but looked generic. We rebuilt it around a white study model, with
  motion that explains the product instead of decorating it.

## Accomplishments

- A hand-computed oracle table that the production engine matches, and tests that never special-case the
  demo coordinates.
- A door you can drag in 3D, whose result updates live, on desktop and phone.
- A full review loop from proposal to receipt with no sign-in.

## What we learned

Honest scope is a feature. Saying "Unsupported" is better than a confident wrong answer, and flagging a
document for a person is better than pretending to update it.

## What's next

More door types and swings, rotated furniture, more rooms per scene, and importing plans from common
formats, each behind the same exact-geometry contract.

## Built with

TypeScript, Next.js, React, React Three Fiber, three.js, Zustand, Zod, Vitest, fast-check, Playwright,
axe-core, Vercel, Kiro.

## Images (upload in this order)

`screenshots/01-landing-hero.jpg`, `09-studio-conflict-3000.jpg`, `10-studio-model-conflict-3000.jpg`,
`11-studio-pass-2400.jpg`, `12-studio-compare.jpg`, `13-studio-decision.jpg`, `14-studio-committed.jpg`,
`08-landing-kiro.jpg`.
