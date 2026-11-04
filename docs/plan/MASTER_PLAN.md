# PLANRIFT — Master Plan

Architecture Revision Consequence Studio · Kiroween 2026 · Category: Frankenstein
Plan date: Wednesday 4 November 2026 · Deadline: Friday 4 December 2026, 2:00 PM PT (absolute)

Status vocabulary for every task: **Planned · In progress · Implemented · Tested · Verified · Released**.
The live tracker is `.kiro/specs/*/tasks.md` (Kiro task UI) plus `docs/STATUS.md`. This document is
the reference plan; when they disagree, the specs and evidence win and this file is corrected.

User decisions (4 Nov): Vercel + GitHub (private until release, then public after a secret scan
and approval) · user records the voiceover · research proceeds with defaults.

---

## A. Executive assessment

**Feasibility: high, if scope holds.** The hard part — a trustworthy door-sweep solver — is
already implemented and verified (75 domain tests, including independent oracles and
metamorphic properties; `docs/evidence/` once recorded). The remaining risk is breadth: a
polished 2D editor, synchronised 3D cutaway, comparison and decision flow in about four weeks,
plus deployment and submission media. A single flagship workflow with fixed supported geometry
is achievable; a general floor-plan editor is not and is excluded.

**Competitiveness.** Judges weigh impact, implementation, design, idea and presentation (the
brief states 20 % each; re-verify on the Rules tab, which the fetcher could not read). PLANRIFT's
strengths map directly:

| Criterion | What earns it |
|---|---|
| Technological implementation | Exact signed-separation solver with integer predicates; per-millimetre hinge map; one canonical scene driving 2D, 3D, ledger, receipts; property and metamorphic tests |
| Design | Drawing-quality plan, restrained 3D, status = text + icon + pattern |
| Potential impact | A daily, concrete problem for fit-out and hospitality teams: "what does this change break?" |
| Idea | Pre-commit revision rehearsal with an evidence receipt, instead of post-hoc clash detection |
| Presentation | A 2:40 video where one door move visibly propagates to plan, 3D and documents |

**Frankenstein justification.** PLANRIFT stitches together parts that normally live in separate
tools — a CAD-style plan editor, a computational-geometry engine, a live WebGL room, a revision
diff/version system, a document dependency ledger and an audit receipt — into one loop where a
single edit flows through all of them in real time. The stitching is functional (one scene, one
analysis, many consumers), not a list of libraries.

**What would sink it:** a status that is visibly wrong, 2D/3D disagreement, a broken public URL,
an unfinished video. The plan front-loads correctness (done), then the vertical slice, then an
early deploy (13 Nov), and freezes features on 24 Nov.

---

## B. Competitive research

Verified this session (vendor pages fetched 4 Nov 2026):

| Product | What it does (as stated by vendor) | Relevance |
|---|---|---|
| BIMcollab Zoom | Model checking and clash detection over federated IFC models; "Smart Issues" track clash status; IDS validation | Post-hoc coordination of full BIM models; needs IFC models and a BIM manager workflow |
| Graphisoft Archicad | BIM authoring; built-in clash detection and issue tracking; drawings and annotations update automatically from the model; from $177/month/seat (Studio, annual) | In a full BIM model, schedules and drawings regenerate; the problem PLANRIFT addresses is smaller there |
| Snaptrude | AI-assisted BIM for early design; live-linked program tables; Revit export | Concept design and programming, not revision consequence checking |

Not fetchable this session (403 or JavaScript-only) — positioning below uses general knowledge and
must be re-verified in a real browser in PLR-00-04: Autodesk Navisworks (federated clash
detection), Revit (interference check; schedules generated from the model), Bluebeam Revu (PDF
markup, document compare/overlay), Rayon (browser-based collaborative 2D floor plans).

**Credible gap (hypothesis, not proven).** Clash tools assume a coordinated 3D model and run after
modelling; BIM authoring keeps drawings in sync automatically. Many small interiors and fit-out
teams work from 2D CAD and PDF sets where drawings and door schedules are separate files. For
them, "if I move this door, what clashes and which sheets must I reissue?" is answered manually.
PLANRIFT's position: **fast, explainable, pre-commit rehearsal of a single revision on simplified
room geometry, with the review consequences documented.** We do not claim better clash detection
than Navisworks or BIMcollab, and the README says so.

---

## C. Product requirements

### Personas
Primary: interior / fit-out designer at a small studio revising a hotel guest room.
Secondary: design coordinator reviewing the change; a judge exploring the demo cold.

### Core workflow
LOAD (Aster House opens) → PROPOSE (move D-101) → SIMULATE (plan, sweep, 3D update live) →
DETECT (status, strike angle, intrusion, hinge map) → COMPARE (Baseline / A / B) → REVIEW
(document ledger, submit for review) → COMMIT (accept with receipt, or reject with note).

### P0 — must ship
| ID | Requirement |
|---|---|
| P0-1 | Landing page `/` explaining the concept with the real product, limitations, CTA to `/demo` |
| P0-2 | `/demo` opens Aster House anonymously; no account, paid API, upload, camera or third-party call |
| P0-3 | Canonical scene with integer-mm geometry; schema-validated |
| P0-4 | Door-sweep solver with PASS / NEAR_CLEARANCE / CONTACT_REVIEW / CONFLICT / INVALID / UNSUPPORTED |
| P0-5 | 2D plan: walls, door leaf + swing arc, furniture, dimensions, selection, conflict footprint, strike marker |
| P0-6 | Editing D-101: number field, drag along the wall, keyboard nudges; live analysis; no "Analyze" button |
| P0-7 | Hinge position map along the wall (status at every integer offset) |
| P0-8 | 3D cutaway synchronised with the plan: walls, opening, leaf at max reachable angle, furniture, highlight |
| P0-9 | Analysis panel: what changed, what was tested, involved IDs, result, measurements, assumptions, manual checks |
| P0-10 | Document impact ledger (A-101, A-401, D-01 REVIEW_REQUIRED); R-513 unaffected |
| P0-11 | Scenarios: create A/B, switch, undo/redo, discard; comparison Baseline vs A vs B |
| P0-12 | Lifecycle: draft → ready for review → accepted / rejected; superseded; receipt |
| P0-13 | Exports: project JSON, receipt JSON + printable HTML, impact CSV, plan SVG; import JSON |
| P0-14 | Local persistence with reset demo; corrupt storage discarded safely |
| P0-15 | Accessibility (keyboard, focus, non-colour status, live region, reduced motion) and responsive layouts |
| P0-16 | Automated verification (unit, property, e2e, a11y) and visual QA evidence |
| P0-17 | Public GitHub with `.kiro`, MIT license, README; Vercel deployment; screenshots; YouTube video; Devpost entry |

### P1 — valuable, after P0 is verified
Leaf width / handing editing in the UI (engine already supports it) · furniture move editing ·
furniture–furniture overlap check · second sample scenario · richer timeline · keyboard command
palette · per-field dependency editing UI.

### P2 — future, out of scope
DWG/DXF/IFC/Revit interop · polygonal rooms · rotated furniture · full 3D clash · multi-user and
cloud storage · code compliance · AI suggestions.

### Non-goals and forbidden claims
Not a CAD/BIM replacement, not a compliance or permit tool, not an automatic drawing updater, not
a structural simulator, not a generative designer. No claims of safety or approval.

---

## D. Technical architecture

```
            ┌──────────── src/domain (pure TS, no React/Three) ─────────────┐
 import ──▶ │ schema (zod) ─▶ Scene ─▶ analyzeScene ─▶ SceneAnalysis        │
 seed   ──▶ │                  │          │  hingeMap, explain              │
            │                  └─ diff ─▶ impacts ─▶ compare ─▶ receipt     │
            │ scenario lifecycle (editScenario, undo, submit, accept…)      │
            └───────────────────────────────┬───────────────────────────────┘
                                            │ (scene, analysis)
             src/render (pure)  buildPlanModel · buildCutawayModel · transforms
                                            │
     src/state (zustand) ── actions call domain functions; selectors memoise by scene
                                            │
     src/components ─ PlanView (SVG) · Cutaway (R3F) · Inspector · Analysis · Ledger ·
                      Compare · Decision · Timeline · Export/Import
```

- **Canonical scene** (`src/domain/model/schema.ts`): project, settings (τ = 1 mm, T = 100 mm),
  rooms (rectangular, explicit wall records, doors, furniture with discriminated footprints),
  documents, element→document links with trigger fields. Unsupported concepts are representable
  (circle/polygon/rotated footprints, non-90° swings) so they can be reported as UNSUPPORTED.
- **Geometry engine**: door frames (exact integer rotation/reflection), signed separation with
  exact predicates, strike range, overlap area and footprint (`docs/geometry/GEOMETRY_CONTRACT.md`).
- **Analysis**: per-door validity, per-furniture validity, per-pair statuses, max opening angle,
  worst-status roll-ups; hinge map reuses the same functions.
- **Revision model**: committed revisions (REV-0 baseline, REV-n on acceptance), scenarios with
  undo/redo stacks (200), lifecycle gates, receipts with SHA-256 fingerprints of canonical JSON.
- **Comparison**: columns for the source revision and each scenario, all values from analysis.
- **Impact graph**: authored links (`fields: ['*']` or field list) × diff → REVIEW_REQUIRED records
  per document, scoped to the changed element (room isolation by construction).
- **Render models**: pure functions mapping scene + analysis to plan primitives (mm, y-up) and
  cutaway primitives (metres, plan +y → three −z). A test asserts both agree with the canonical
  geometry within 0.5 mm.
- **State**: zustand store holds `ProjectState`, active scenario, selection and UI state; drags
  preview a transient edit and commit one undo step on release.
- **Persistence**: `localStorage` key `planrift.project.v1` storing the project file format;
  validated on load; reset restores the seed.
- **Deployment**: Vercel (Node 22), static pages + client app, CSP and security headers from
  `next.config.ts`, no server state, no environment secrets.

---

## E. Mathematical specification

The full specification with derivations and oracle values is
`docs/geometry/GEOMETRY_CONTRACT.md`. Summary:

- Door-local frame: hinge origin, closed leaf along +u, swing toward +v; sweep is the quarter disk
  Q = {u ≥ 0, v ≥ 0, u² + v² ≤ R²}.
- Signed separation s = max over directions of [min_B b·d − h_Q(d)] = distance when disjoint,
  −penetration depth when overlapping; closed form via eight candidates.
- Statuses: CONFLICT s < −τ; CONTACT_REVIEW |s| ≤ τ; NEAR_CLEARANCE τ < s < T; PASS s ≥ T; decided
  by exact integer predicates.
- Strike angle θ = atan2(y₁, min(x₂, √(R² − y₁²))); overlap area by closed-form integral.
- Supported: axis-aligned rectangular rooms and footprints, single-leaf hinged doors, 90° interior
  swing, any of 4 walls, either handing. Unsupported → UNSUPPORTED. Invalid (hinge/leaf outside
  wall, leaf longer than room depth, overlapping openings, furniture outside room, degenerate
  footprint) → INVALID.
- Verification: hand values, boundary sampling distance oracle, translation-search penetration
  oracle, overlap predicate, Lipschitz property, rotation/mirror/translation invariance, shoelace
  vs closed-form area, leaf-segment check at the strike angle, hinge map vs full analysis.

---

## F. UX and design system

Screens: Landing (`/`) · Demo workspace (`/demo`) with Compare view and Decision dialog ·
printable receipt (generated HTML file).

**Workspace layout (≥ 1200 px):**
header (project, scenario tabs Baseline/A/B/+, lifecycle chip, undo/redo, export, reset) ·
left rail (rooms → elements tree, document list) · centre: plan (primary) above a 3D cutaway
(resizable split) · right column: inspector for the selection (hinge field, handing, measures) →
analysis card (status, headline, details, manual checks) → impact ledger · bottom: timeline of
edits and decisions.
**Tablet (768–1199):** plan full width; 3D and panels stack. **Mobile (< 768):** read-only
inspection: scenario switcher, plan, status cards, comparison table, ledger; editing labelled
"available on desktop".

Interaction patterns: select by click/Enter; drag the door handle along the wall with snapping
(10 mm; Alt 1 mm); arrow keys on the focused handle; number field with inline validation; hinge
map hover shows band and limiting furniture; Compare toggles a three-column synchronised view.

Tokens and typography: `.kiro/steering/design-system.md` (canvas #F4F2EC, ink #202B31,
blueprint #31566F, copper #A8784E, coral #CA6758, evergreen #377467; Geist Sans/Mono).
Accessibility: `.kiro/steering/accessibility.md` (WCAG 2.2 AA target).

Visual QA: real-browser screenshots at 1440×900, 1280×800, 1024×768, 390×844 for each key state
(baseline, conflict, alternative, compare, ledger, decision, mobile); defects logged and re-shot.

---

## G. Kiro-native project structure

| Artifact | Location | Purpose |
|---|---|---|
| Steering (always) | `.kiro/steering/product.md`, `tech.md`, `structure.md`, `security.md` | Philosophy, stack, boundaries, security |
| Steering (fileMatch) | `geometry.md` (domain/tests/render), `design-system.md`, `accessibility.md` (UI), `testing.md` (tests) | Loaded when relevant files are in context |
| Steering (manual) | `release.md` → `/release` | Hackathon obligations and release gates |
| Specs | `.kiro/specs/{core-geometry-engine, revision-workflow, studio-experience, quality-assurance, release-submission}` | requirements.md (EARS), design.md, tasks.md |
| Custom agents | `.kiro/agents/{geometry-engineer, frontend-experience-engineer, visualization-3d-engineer, architecture-reviewer, qa-engineer, release-producer}.md` | Path-scoped write permissions; steering in `resources` |
| Hooks | `.kiro/hooks/` | see below |
| MCP | template `docs/setup/mcp.playwright.example.json` | Kiro blocks agent writes to `.kiro/settings/`; the user adds it via "Kiro: Open workspace MCP config" |

Hooks (all verified with sample payloads; scripts in `scripts/kiro/`):

| Hook | Trigger | Action |
|---|---|---|
| task-completion-gate | PostTaskExec | typecheck, lint, unit tests, Prettier check on changed files |
| task-start-gate | PreTaskExec | block starting a task while typecheck fails (exit 2) |
| geometry-regression | PostFileSave `(src|tests)/domain/*.ts` | domain test suite |
| secret-guard | PreToolUse write tools | block credential-like content and .env/key paths |
| public-action-guard | PreToolUse shell | ask before vercel / gh repo / git push / npm publish; block commits on failing typecheck |
| session-resume | SessionStart | print git state, spec task counts, STATUS progress |

Concurrency rule: only `geometry-engineer` writes `src/domain/**` (enforced by deny rules in the
other agents). Parallel sub-agents may work on UI, 3D, QA and docs.

---

## H. Development phases and tasks

Task Definition of Done (applies to every task): code merged on `main`; typecheck, lint and
relevant tests pass; acceptance criteria demonstrated; evidence recorded (test summary, screenshot
or URL) in `docs/evidence/`; status updated in specs and `docs/STATUS.md`.

Priorities: P0 must ship · P1 valuable · P2 future.

### Phase 00 — Research (gate: feasible, current architecture)
| ID | Task | Pri | Deps | Acceptance / evidence | Status |
|---|---|---|---|---|---|
| PLR-00-01 | Verify Kiro docs: specs, hooks v1 schema, agents, subagents, MCP, models | P0 | — | Formats used match kiro.dev .md docs | Implemented |
| PLR-00-02 | Verify Kiroween dates, category, submission requirements | P0 | — | kiroween.devpost.com overview read 4 Nov | Implemented |
| PLR-00-03 | Verify toolchain and package versions; pin | P0 | — | `docs/STATUS.md` toolchain table | Implemented |
| PLR-00-04 | Browser re-check of Rules tab, FAQ, Navisworks/Revit/Bluebeam/Rayon | P0 | — | Notes in `docs/research/` with dates | Planned |
| PLR-00-05 | Geometry approach and risk register | P0 | — | GEOMETRY_CONTRACT.md; §O risks | Implemented |

### Phase 01 — PRD and specifications (gate: every P0 requirement testable)
| PLR-01-01 | Master plan (this file) | P0 | 00-* | Sections A–Q | Implemented |
| PLR-01-02 | Geometry contract with hand oracle | P0 | 00-05 | §7 table | Verified |
| PLR-01-03 | Kiro specs (5) with EARS requirements, design, tasks | P0 | 01-01 | Files in `.kiro/specs/` | In progress |
| PLR-01-04 | Steering files | P0 | 01-01 | 9 files | Implemented |

### Phase 02 — Foundation (gate: app runs locally; tests execute)
| PLR-02-01 | package.json with pinned deps; tsconfig strict; ESLint; Prettier | P0 | 00-03 | `npm run typecheck` clean | Implemented |
| PLR-02-02 | Vitest + fast-check configured | P0 | 02-01 | 75 tests run | Tested |
| PLR-02-03 | Next.js app shell (`/`, `/demo`), fonts, tokens, security headers | P0 | 02-01 | `npm run build` passes; headers present | Planned |
| PLR-02-04 | Playwright + axe configured; browsers installed | P0 | 02-03 | sample e2e passes | Planned |
| PLR-02-05 | Custom agents, hooks, MCP template | P0 | 01-04 | files present; hook scripts tested | Implemented |
| PLR-02-06 | Git repository and first commit | P0 | 02-01 | `git log` | Implemented |

### Phase 03 — Canonical geometry engine (gate: independent tests pass incl. flagship)
| PLR-03-01 | Schema + seed (R-512, R-513 mirror, documents, links) | P0 | 02-01 | schema test | Tested |
| PLR-03-02 | Door frames and wall segments (exact integer transforms) | P0 | 03-01 | rotation/mirror tests | Tested |
| PLR-03-03 | Signed separation + exact predicates | P0 | 03-02 | flagship values, oracle properties | Tested |
| PLR-03-04 | Strike range, overlap area, footprint | P0 | 03-03 | shoelace vs integral; leaf check | Tested |
| PLR-03-05 | Validity: INVALID / UNSUPPORTED rules | P0 | 03-02 | 5400 mm, 120°, exterior, sliding, rotated, circle, outside, degenerate | Tested |
| PLR-03-06 | Scene analysis + explanations | P0 | 03-03..05 | explanation text test | Tested |
| PLR-03-07 | Hinge map | P0 | 03-06 | bands = contract; agrees with analysis | Tested |

### Phase 04 — Versioning and revision model (gate: propose/compare/revert/commit safely)
| PLR-04-01 | Diff (field-level, presence) | P0 | 03-01 | empty diff on unchanged/serialised | Tested |
| PLR-04-02 | Scenarios, edits, undo/redo, discard | P0 | 04-01 | property: sequences stay valid and reversible | Tested |
| PLR-04-03 | Lifecycle gates, accept/reject, supersede, receipts | P0 | 04-02 | lifecycle tests | Tested |
| PLR-04-04 | Comparison model | P0 | 04-02 | Baseline/A/B test | Tested |

### Phase 05 — 2D architectural editor (gate: real edits change geometry, fresh analysis)
| PLR-05-01 | Plan render model + transforms (pure) | P0 | 03-06 | render tests | Planned |
| PLR-05-02 | PlanView SVG: walls, opening, leaf, arc, furniture, labels, dimensions | P0 | 05-01 | screenshot | Planned |
| PLR-05-03 | Selection, hover, focus; element tree | P0 | 05-02 | component test | Planned |
| PLR-05-04 | Hinge drag with snapping; keyboard nudges; number field | P0 | 05-03 | e2e drag + keyboard | Planned |
| PLR-05-05 | Conflict footprint, strike marker, clearance dimension | P0 | 05-02 | screenshot at 3000 | Planned |
| PLR-05-06 | Hinge position map strip | P0 | 03-07 | e2e hover text | Planned |

### Phase 06 — 3D cutaway (gate: 3D matches canonical model and 2D)
| PLR-06-01 | Cutaway render model + transform tests | P0 | 05-01 | agreement test ≤ 0.5 mm | Planned |
| PLR-06-02 | R3F scene: floor, cut walls, opening, leaf at max angle, furniture, sweep, highlight | P0 | 06-01 | screenshot | Planned |
| PLR-06-03 | Camera presets, orbit, reduced motion, WebGL fallback | P0 | 06-02 | e2e fallback | Planned |

### Phase 07 — Consequence analysis UI (gate: visuals and text mathematically consistent)
| PLR-07-01 | Analysis card (status, headline, details, assumptions, manual checks) | P0 | 03-06 | e2e text at 1700/3000/2400 | Planned |
| PLR-07-02 | Live region announcements | P0 | 07-01 | a11y test | Planned |

### Phase 08 — Document impact graph (gate: D-101 edit flags A-101, A-401, D-01 only)
| PLR-08-01 | Ledger panel with reasons, link notes, "not modified by PLANRIFT" | P0 | 04-01 | e2e | Planned |
| PLR-08-02 | Document list in left rail with review badges | P1 | 08-01 | screenshot | Planned |

### Phase 09 — Alternative comparison (gate: judge understands A vs B in seconds)
| PLR-09-01 | Scenario tabs; create A/B; switch | P0 | 04-02 | e2e | Planned |
| PLR-09-02 | Compare view: three synchronised mini plans + table | P0 | 04-04 | screenshot | Planned |
| PLR-09-03 | Decision dialog: submit, accept, reject, receipt | P0 | 04-03 | e2e | Planned |
| PLR-09-04 | Timeline of edits and decisions | P0 | 04-02 | screenshot | Planned |

### Phase 10 — Export and persistence (gate: save, reload, compare, export correctly)
| PLR-10-01 | localStorage persistence + safe load + reset | P0 | 04-02 | e2e reload | Planned |
| PLR-10-02 | Project JSON export/import UI with error list | P0 | 04-* | e2e round trip | Planned |
| PLR-10-03 | Receipt HTML (escaped, printable) + JSON | P0 | 04-03 | unit + e2e download | Planned |
| PLR-10-04 | Impact CSV; plan SVG export | P0 | 05-02 | unit + e2e download | Planned |

### Phase 11 — Complete UI/UX (gate: coherent, accessible, polished)
| PLR-11-01 | Landing page with live product preview, limitations, CTA | P0 | 05-02 | screenshot | Planned |
| PLR-11-02 | Onboarding hint strip for the judge path | P0 | 09-* | screenshot | Planned |
| PLR-11-03 | Empty, error, import-failure states | P0 | 10-02 | e2e | Planned |
| PLR-11-04 | Responsive tablet/mobile layouts | P0 | 05-*, 09-* | screenshots | Planned |

### Phase 12 — Complete judge demonstration (gate: anonymous judge completes §K)
| PLR-12-01 | Judge flow e2e test matching §K | P0 | 05–11 | passing test | Planned |
| PLR-12-02 | "Load guided scenario" (creates A and B from the real edit path) | P1 | 09-01 | e2e | Planned |

### Phase 13 — Automated testing and security (gate: release tests pass with evidence)
| PLR-13-01 | Unit + property suites complete | P0 | — | evidence file | In progress |
| PLR-13-02 | E2E suite (flow, persistence, exports, import errors) | P0 | 12-01 | evidence | Planned |
| PLR-13-03 | Axe accessibility checks | P0 | 11-* | 0 serious/critical | Planned |
| PLR-13-04 | Security review: headers, CSP, import fuzz, dependency audit, secret scan | P0 | 10-* | `docs/evidence/SECURITY.md` | Planned |

### Phase 14 — Visual QA (gate: real visual review passed)
| PLR-14-01 | Screenshot matrix (4 sizes × 7 states) inspected; defects fixed; re-shot | P0 | 11-* | `docs/evidence/visual/REPORT.md` | Planned |

### Phase 15 — Production deployment (gate: live URL works in clean browser)
| PLR-15-01 | User runs `vercel login`; link project (approval) | P0 | 13-* | `vercel whoami` | Planned |
| PLR-15-02 | First deploy by 13 Nov (approval) | P0 | 12-01 | URL + e2e against URL | Planned |
| PLR-15-03 | Final production deploy after freeze (approval) | P0 | 14-01 | URL, headers, Lighthouse notes | Planned |

### Phase 16 — GitHub release (gate: public, complete, reproducible)
| PLR-16-01 | README, LICENSE (MIT), CONTRIBUTING-lite, docs index | P0 | — | files | Planned |
| PLR-16-02 | Secret scan of history; `.kiro` not ignored | P0 | 16-01 | evidence | Planned |
| PLR-16-03 | User runs `gh auth login`; create private repo; push (approval) | P0 | 16-02 | repo URL | Planned |
| PLR-16-04 | Make public; About license visible; topics (approval) | P0 | 16-03, 15-03 | repo page check | Planned |

### Phase 17 — Submission imagery (gate: every image is a working state)
| PLR-17-01 | Capture 8 screenshots from the deployed app (Playwright, 2× DPR) | P0 | 15-03 | `docs/submission/screenshots/` | Planned |

### Phase 18 — Demonstration video (gate: polished, < 3:00, verified)
| PLR-18-01 | Script + shot list + captions (`docs/submission/VIDEO.md`) | P0 | 12-01 | file | Planned |
| PLR-18-02 | Screen recordings (Playwright video or macOS capture) | P0 | 15-03 | raw clips | Planned |
| PLR-18-03 | User voiceover; edit; captions; export MP4; thumbnail | P0 | 18-02 | MP4 ≤ 2:50 verified | Planned |

### Phase 19 — YouTube (gate: verified public URL)
| PLR-19-01 | User uploads (or assisted via browser tool) with title/description; public (approval) | P0 | 18-03 | URL plays logged out | Planned |

### Phase 20 — Devpost (gate: verified submission)
| PLR-20-01 | Draft entry by 13 Nov with placeholders | P0 | 15-02 | draft exists | Planned |
| PLR-20-02 | Final fields, review with user, submit (approval) | P0 | 16-04, 19-01 | confirmation page | Planned |

### Phase 21 — Final audit (gate: defensible entry, no misleading claims)
| PLR-21-01 | Architecture reviewer pass on claims; links, license, video, demo re-checked | P0 | 20-02 | `docs/reviews/final.md` | Planned |

---

## I. Testing strategy

| Layer | Content | Status |
|---|---|---|
| Unit — geometry | flagship hand values, status band boundaries, exact tangency, input rejection | 29 tests passing |
| Property — geometry | oracle agreement (300 runs), overlap predicate (2000), classification consistency (3000), Lipschitz (1000), determinism, area cross-check, strike-angle leaf check | passing |
| Unit/property — analysis | seed valid, baseline PASS, mirror symmetry, A/B/invalid/unsupported, isolation property, hinge map bands and agreement, rotation/mirror/translation invariance | 17 tests passing |
| Unit/property — revision & IO | diff, ledger isolation, field-scoped links, edit rejection, undo/redo property, lifecycle gates, comparison, round trip, 11 malformed-import cases, CSV injection | 29 tests passing |
| Render | 2D and 3D models agree with canonical geometry ≤ 0.5 mm; no hardcoded coordinates | planned |
| Component | inspector validation messages, scenario tabs, decision dialog gates | planned |
| E2E | judge flow (§K), drag, keyboard, persistence reload, export/import, import errors, reset | planned |
| Accessibility | axe on landing and demo states; keyboard-only judge flow | planned |
| Visual | screenshot matrix reviewed by a person/agent; optional `toHaveScreenshot` locally | planned |

The 18 mandatory properties from the brief map to tests as follows: 1 determinism (analysis &
separation) · 2 empty diff · 3 isolation property · 4/5/6 flagship tests · 7 tangency tests ·
8 threshold tests · 9 unsupported tests · 10 submit/accept gates on INVALID · 11 discard ·
12 undo/redo property · 13 render agreement (planned) · 14 ledger persists on PASS ·
15 round trip · 16 malformed imports · 17 no hardcoded statuses (architecture review + render
tests) · 18 e2e asserts state change for every demo action (planned).

---

## J. Security and data validation

- Import: ≤ 2 MB; `JSON.parse` only; strict zod schemas (unknown keys rejected, `__proto__`
  rejected as unknown key); integer mm within ±100 000; bounded strings/arrays; unique IDs;
  referential integrity; SHA-256 fingerprint verification of committed revisions.
- Rendering: React escaping; receipt HTML escapes all values; no `dangerouslySetInnerHTML` with
  user data; SVG export built from the render model, not from imported markup.
- CSV: formula-injection prefixing; RFC 4180 quoting.
- Persistence: versioned key, validated on load, discarded with a notice on failure.
- Headers: CSP `default-src 'self'` (no external origins), `frame-ancestors 'none'`,
  `object-src 'none'`, nosniff, referrer policy, permissions policy, COOP.
- Supply chain: exact pins, lockfile committed, `npm audit --omit=dev` reviewed before release.
- Secrets: none needed. Hook blocks credential-like writes; history scan before publication.

---

## K. Judge demo specification (Aster House Hotel)

Every value below is computed live; the e2e test asserts each one.

| Step | Judge action | Expected computed result |
|---|---|---|
| 1 | Open `/demo` | Baseline loaded. D-101 hinge 1,700 mm. Status PASS. "D-101 opens the full 90°". F-07 clearance 1,083.7 mm. Ledger: no records. |
| 2 | Click "New scenario" → Revision A; set hinge to 3000 (type, drag or arrows) | Status CONFLICT with F-07. "D-101 strikes Console F-07 after opening 15.7° of 90°." Intrusion 188.7 mm; overlap 0.041 m². Plan: coral footprint, strike marker at x 3,818. 3D: leaf stops at 15.7°, console highlighted. |
| 3 | Inspect ledger | A-101, A-401, D-01 — REVIEW_REQUIRED, reason "D-101 hinge position 1,700 mm → 3,000 mm (+1,300 mm)". No A-402, no D-102, nothing for R-513. |
| 4 | Hover the hinge map | Bands: 0–2,698 PASS · 2,699–2,800 near · 2,801–2,802 contact · 2,803–4,098 conflict (F-07) · 4,099–4,101 contact · 4,102–4,199 near · 4,200–5,150 PASS · 5,151–6,000 invalid. |
| 5 | Try 5400 | INVALID: "leaf would extend 250 mm beyond the east end of the south wall". Submit disabled. |
| 6 | New scenario → Revision B; hinge 2400 | PASS, clearance 391.5 mm, full 90°. Ledger still lists A-101, A-401, D-01 (review persists). |
| 7 | Compare | Baseline 1,700 PASS · A 3,000 CONFLICT 15.7° · B 2,400 PASS 391.5 mm; impacts 0 / 3 / 3. |
| 8 | Submit A → Reject with note; Submit B → Accept (acknowledge documents) | A rejected; B accepted; REV-1 committed; receipt shows fingerprints, changes, results, impacts, limitations. |
| 9 | Export | Receipt (HTML/JSON), CSV ledger, project JSON, plan SVG download. |
| 10 | Reload page | State persists. "Reset demo" restores the baseline. |

---

## L. Deployment and GitHub

- Reproducible build: `npm ci && npm run verify && npm run build`; Node 22; lockfile committed.
- Hosting: Vercel project `planrift` (framework preset Next.js, no env vars). The user runs
  `vercel login`; deploys run only after approval (hook asks). Verify: `/` and `/demo` load in a
  clean profile; headers present; e2e suite against the URL (`PLAYWRIGHT_BASE_URL`).
- GitHub: user runs `gh auth login`. Private repo during the build; public at release after a
  history secret scan. MIT `LICENSE` at root (detected in About). `.kiro/` tracked. README covers
  purpose, demo URL, video, install, test, architecture, geometry contract, limitations, Kiro usage.
- Open-source compliance: dependency licenses reviewed (MIT/ISC/Apache-2.0/OFL fonts); no
  third-party trademarks or copyrighted media in the repo or video.

---

## M. Screenshot and video production

Screenshots (deployed app, 1440×900 at 2× DPR, Playwright-driven so states are exact):
1 hero (plan + 3D + status, revision A) · 2 baseline clear sweep · 3 conflict at 3000 · 4
conflict detail card · 5 alternative at 2400 · 6 compare A vs B · 7 impact ledger · 8 accepted
receipt + exports · 9 Kiro specs/hooks in the IDE (optional, real).

Video (target 2:40, hard limit < 3:00): 0:00 problem · 0:15 product · 0:30 baseline · 0:55
conflict at 3000 · 1:25 alternative 2400 · 1:45 documents still need review · 2:05 compare and
commit · 2:25 how it is computed and built with Kiro · 2:40 end card. Real screen recordings
only; user voiceover; burned-in captions plus an SRT; no music unless licensed (optional
royalty-free). Deliverables in `docs/submission/VIDEO.md`: script, shot list, timings, captions,
title, description, thumbnail plan. Length verified with `ffprobe` before upload.

---

## N. YouTube and Devpost

- Requires the user's own logins. Kiro never handles passwords, cookies or 2FA codes.
- Preferred: the user uploads with the prepared title/description/captions; Kiro then verifies the
  public URL plays in a logged-out browser and is under 3:00. Assisted alternative: the user
  enables the Playwright MCP from the template, logs in themselves, and Kiro fills fields, stopping
  before every publish/submit click for approval. CAPTCHAs are never bypassed.
- Devpost: draft by 13 Nov; fields prepared in `docs/submission/DEVPOST.md` (name, tagline,
  description, how it was built, Kiro usage, challenges, accomplishments, what's next, built-with,
  category Frankenstein, repo URL, app URL, video URL). Final review with the user, approval,
  submit, then verify the entry shows as submitted on the hackathon page.

---

## O. Risk-managed timeline

| Date | Milestone | Status |
|---|---|---|
| Wed 4 Nov | M1 architecture & setup · M2 geometry core proven | Done (evidence: tests) |
| Fri 6 Nov | M3 interactive revision loop (plan editor + analysis + ledger) | Planned |
| Mon 9 Nov | M4 synchronised 2D/3D | Planned |
| Wed 11 Nov | M5 ledger, comparison, decision flow | Planned |
| Fri 13 Nov | M6 judge demo functional · first deploy · Devpost draft | Planned |
| Tue 17 Nov | M7 automated testing complete | Planned |
| Fri 20 Nov | M8 visual polish | Planned |
| Tue 24 Nov | M9 feature freeze · M10 production deploy | Planned |
| Wed 25 Nov | M11 GitHub public | Planned |
| Thu 26 – Sat 28 Nov | M12 video (voiceover by user) | Planned |
| Sun 29 Nov | M13 YouTube public | Planned |
| Tue 1 Dec | M14 Devpost submitted (also: credits request deadline 12:00 PT) | Planned |
| Wed 2 – Thu 3 Dec | M15 final audit | Planned |
| Fri 4 Dec | Buffer only — deadline 2:00 PM PT | — |

Top risks: geometry correctness (mitigated: done + continuous hook) · 2D/3D divergence (render
agreement tests) · WebGL in production (fallback + early deploy) · scope creep (P0 list frozen) ·
video/voiceover availability (script ready by 20 Nov) · account steps blocked on user (scheduled
asks with dates).

---

## P. Final Definition of Done

Product
- [ ] `/` and `/demo` work anonymously on the public URL in a clean browser (desktop, tablet, mobile)
- [ ] §K judge flow passes as an e2e test against the deployed URL
- [ ] Every displayed status traces to `analyzeScene` or `scene.links` (architecture review PASS)
- [ ] axe: 0 serious/critical violations; keyboard-only flow works
- [ ] Visual QA report signed off with screenshots
Engineering
- [ ] `npm run verify:release` passes; evidence recorded with date and counts
- [ ] Security review complete; secret scan of history clean; `npm audit` reviewed
Repository
- [ ] Public GitHub repo; MIT license shown in About; `.kiro/` present and not ignored
- [ ] README with demo URL, video URL, install/test instructions, limitations, Kiro usage
Media and submission
- [ ] 8 screenshots from the deployed app
- [ ] Video < 3:00, public on YouTube, plays logged out
- [ ] Devpost entry submitted in Frankenstein with all URLs; confirmation verified
- [ ] Final audit file `docs/reviews/final.md` with verdict PASS

---

## Q. Execution handoff

This session already has write and shell access, so execution began immediately after approval
(geometry engine, revision model, steering, agents and hooks are in the repository).

For later sessions in Kiro IDE:
1. Open the PLANRIFT folder. Trust the workspace so project agents and hooks load.
2. Start a session with the **Spec** agent (to run tasks from `.kiro/specs/`) or **Default**,
   and pick **Auto** in the model selector.
3. The SessionStart hook prints the resume summary; read `docs/STATUS.md`.
4. Optional: add the Playwright MCP server by opening the command palette → "Kiro: Open
   workspace MCP config (JSON)" and pasting `docs/setup/mcp.playwright.example.json`. Review it,
   then enable.
5. When an approval is needed (deploy, repo, upload, submit), the agent will stop and ask.
