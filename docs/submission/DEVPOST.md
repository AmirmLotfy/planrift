# Devpost submission (copy-ready)

Every field of the Kiroween 2026 "Enter a submission" form, in form order. Nothing has been
submitted. Numbers come from the engine (`docs/geometry/GEOMETRY_CONTRACT.md`).

Before you submit: the GitHub repo must be **public** (it is private until you say so), the video
must be **public on YouTube** with embedding allowed, and the live app must stay up until the end
of judging (29 January 2027).

---

## Project name (60 max)

```
PLANRIFT
```

## Elevator pitch (200 max, this one is 176)

```
Move a door on a floor plan and PLANRIFT shows what the revision breaks: exact swing clearance against furniture, the drawings that need review, and a receipt for the decision.
```

## Thumbnail and images

- Thumbnail (3:2): `video/out/thumb-devpost.jpg` (rendered from a real frame of the app). An
  image-generation prompt is in `THUMBNAIL_PROMPTS.md` if you prefer a new one.
- Gallery images, in this order: `screenshots/01-landing-hero.jpg`,
  `09-studio-conflict-3000.jpg`, `10-studio-model-conflict-3000.jpg`, `11-studio-pass-2400.jpg`,
  `12-studio-compare.jpg`, `13-studio-decision.jpg`, `14-studio-committed.jpg`, `08-landing-kiro.jpg`.

## About the project (Markdown)

Paste everything between the two rules.

---

## Inspiration

Every architect has a version of this story. A door moves a metre on a revision, the drawings go out, and the first time someone opens it on site it slams into the furniture. The clearance check is easy once you know to do it. What gets missed is that a "small" move changed the answer, and that three other drawings now disagree with the plan.

We wanted a rehearsal step between "I moved it" and "it's issued".

## What it does

PLANRIFT is a revision consequence studio for simplified room geometry. You propose a change, the engine computes what it breaks, you see which drawings need a person, compare alternatives, and record the decision.

In the fictional Aster House Hotel sample, door D-101 (850 mm leaf) opens toward console F-07:

- **Exact swing clearance.** Approved plan, hinge at 1,700 mm: 1,083.7 mm clear. Revision A, hinge at 3,000 mm: the leaf strikes the console after 15.7° and would push 188.7 mm into it. Revision B, 2,400 mm: full 90° swing, 391.5 mm clear.
- **Hinge map.** A strip along the wall shows the result at every position the door could take.
- **One model, two views.** The SVG plan and the WebGL study model are rendered from the same scene and the same analysis, so they cannot disagree. You can drag the door in either.
- **Drawings to reissue.** The sheets linked to D-101 (floor plan A-101, elevation A-401, door schedule D-01) are flagged _Review required_. PLANRIFT never edits them, and the sheet for room 513 stays unflagged.
- **Compare, decide, keep a receipt.** Branch scenarios from the approved revision, compare them side by side, submit for review, acknowledge the flagged sheets and accept. The decision becomes a receipt (JSON or printable HTML) with fingerprints of the scene before and after.
- **Honest limits.** Rotated furniture, sliding doors and swings other than 90° are reported as _Unsupported_, never _Pass_. PLANRIFT does not claim code compliance, construction approval or CAD/BIM import.

**Why Frankenstein:** it stitches together parts that normally live in separate tools: a CAD-style plan editor, a computational-geometry engine, a live 3D room, revision control, a document ledger and an audit trail. They share one scene and one analysis, so a single edit flows through all of them at once.

## How we built it

- **Engine** (`src/domain`, pure TypeScript, no React): a zod schema in integer millimetres, a signed-separation solver between the door's swept quarter-disc and rectangles, status rules, revision diff, impact ledger, scenarios, receipts and SHA-256 scene fingerprints. Every status is decided by an exact integer predicate, for example `437,300 < 849² = 720,801 ⇒ conflict`. Floats are used only for display.
- **Render models** (`src/render`): the plan and the 3D scene both derive from `(scene, analyzeScene(scene))`, and tests check that they agree.
- **Interface:** Next.js 16 App Router, React 19 and zustand; the plan is plain SVG; the study model is React Three Fiber with soft shadows; the landing page scroll story uses GSAP and Lenis. A `default-src 'self'` CSP and no analytics, remote fonts or CDNs.
- **Verification:** 83 Vitest unit and property tests (fast-check, independent oracles, metamorphic checks, cases at the tolerance edges), 13 Playwright checks on desktop and phone, and axe accessibility checks on both pages.
- **Built with Kiro** from an empty folder: five specs, nine steering files, seven custom agents and six hooks (details in the technology section below).
- **The demo video** was recorded frame by frame from the deployed app with Playwright and edited in Remotion. Its opening animation is drawn from the engine's real output.

## Challenges we ran into

- Making "exact" mean exact. A status must not flip at a boundary because of floating-point noise, so every decision became an integer predicate and the tests probe the tolerance edges.
- Keeping the 2D plan and the 3D model in agreement without duplicating geometry in components.
- Our first interface passed every test and still looked like a generic dashboard. We rebuilt it around a white architectural study model, with motion that explains the result.
- Recording smooth WebGL footage on a laptop with no GPU. We froze the page clock and captured one frame at a time.

## Accomplishments that we're proud of

- The production engine matches a hand-computed oracle table, and no test special-cases the demo coordinates.
- A door you can drag in 3D whose result updates live, on desktop and on a phone.
- A complete loop from proposal to receipt, with no sign-in.

## What we learned

Honest scope is a feature. _Unsupported_ beats a confident wrong answer, and flagging a drawing for a person beats pretending to update it. We also learned how much hooks change agent work: once tests gate every task, review shifts from catching slips to judging ideas.

## What's next for PLANRIFT

More door types and swing angles, rotated furniture, multi-room scenes, and importing plans from common formats, each behind the same exact-geometry contract.

---

## Built with (25 max, this list is 25)

```
typescript, next.js, react, three.js, react-three-fiber, drei, zustand, zod, svg, webgl, gsap, lenis, vitest, fast-check, playwright, axe-core, testing-library, noble-hashes, css-modules, node.js, vercel, kiro, remotion, ffmpeg, whisper.cpp
```

## "Try it out" links

```
https://planrift-omega.vercel.app
https://planrift-omega.vercel.app/demo
https://github.com/AmirmLotfy/planrift
```

## Video demo link

```
<YouTube URL after upload>
```

## Public code repository URL

```
https://github.com/AmirmLotfy/planrift
```

(MIT licence at the root, detected by GitHub; `.kiro/` at the root and not git-ignored. Make it
public first.)

## Working demo URL

```
https://planrift-omega.vercel.app
```

## Testing instructions (judges only)

```
No account or sign-in. Desktop Chrome or Edge at 1280 px or wider works best; phones get an inspection layout.

1. Landing page: https://planrift-omega.vercel.app
   Drag the door in the 3D model, or use the slider and the Approved / Rev A / Rev B buttons. At 3,000 mm the model shows a conflict with console F-07; at 2,400 mm it passes.

2. Studio: https://planrift-omega.vercel.app/demo
   a. Click "+ New" (a new scenario from the committed revision).
   b. In the right panel, set Hinge position to 3000 and press Enter.
      Expected: Conflict. "D-101 strikes Console F-07 after opening 15.7° of 90°", intrusion 188.7 mm.
   c. Click "Model" above the canvas for the 3D view. Drag the door or use the camera buttons, then click "Plan".
   d. Click "+ New" again, set 2400, press Enter. Expected: Pass, 391.5 mm clear.
   e. Click "Compare": Baseline, Revision A and Revision B side by side.
   f. Under Revision B click "Review", then "Submit for review", tick the acknowledgement for A-101, A-401 and D-01, then "Accept & commit". A receipt appears; download "Receipt .json" or "Printable receipt .html".
   g. Edge case: set 5400. The position is reported as invalid (250 mm beyond the wall), never as a pass.

3. Reset: Export menu > "Reset demo". All state lives only in this browser (localStorage).

4. Run the checks locally (Node 22, npm):
   npm ci && npm run verify        # type check, lint, unit and property tests, production build
   npx playwright install --only-shell chromium && npm run e2e   # Playwright judge flow and axe checks
```

## Explain how your project meets the main technology requirement

```
PLANRIFT was built in the Kiro IDE, starting from an empty folder on 4 November 2026. Everything Kiro produced or enforced is in .kiro/ at the repo root.

Specs (.kiro/specs, 5): core-geometry-engine, revision-workflow, studio-experience, quality-assurance and release-submission. Each has requirements written as EARS acceptance criteria ("WHEN …, THE System SHALL …", 77 in total), a design, and a task list (49 tasks). The geometry spec came first and was written against a hand-computed contract (docs/geometry/GEOMETRY_CONTRACT.md) before any UI existed.

Steering (.kiro/steering, 9): product, tech, structure and security are always included. They carry the truthfulness rules ("Unsupported, never Pass", no compliance claims), pinned versions, the architecture boundaries and the import limits. geometry, design-system, accessibility and testing load by file match when the agent works on those files; release is manual.

Custom agents (.kiro/agents, 7): geometry-engineer, frontend-experience-engineer, visualization-3d-engineer, design-director, qa-engineer, release-producer and a read-only architecture-reviewer. Each has its own scope and tool list, and work was delegated to them as sub-agents. For example, the reviewer audits that no displayed status bypasses the engine.

Agent hooks (.kiro/hooks, 6):
- SessionStart: prints a resume summary from the repository.
- PreTaskExec: blocks a new spec task while the type check fails.
- PostTaskExec: runs type check, lint and tests after each task.
- PreToolUse on file writes: blocks content that looks like a credential.
- PostFileSave on src/domain: re-runs the geometry tests.
- PreToolUse on shell: asks for approval before any deploy, push or publish, and blocks a commit while the type check fails.

Property-based testing: the engine's correctness properties are fast-check properties checked against independent oracles, never against the production formulas, plus metamorphic checks and cases at the tolerance edges.

Kiro also ran the research, the visual QA loops (screenshot, critique, fix) and the scripts that recorded the demo video, while account actions (creating the repository, deploying, publishing) waited for a person's approval. The landing page reads .kiro/ at build time and shows the specs, agents, steering files and hooks in the order they fire.
```

## Pre-existing code disclosure

```
No pre-existing code. The repository was started on 4 November 2026, inside the submission period. The project uses open-source frameworks and libraries from npm (listed under Built with) and two OFL-licensed fonts (Instrument Sans, IBM Plex Mono). The Aster House Hotel sample project is fictional and was written for this entry.
```

## Category

```
Frankenstein
```

## Sponsor / special prizes dropdown and bonus fields

Pick only what you qualify for; leave the rest empty.

| Field                               | What it needs                                                                                                                                    | Fill in if…                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| Best Startup Project                | You are the startup's founder; your LinkedIn profile and the startup website                                                                     | PLANRIFT is (or belongs to) your startup                    |
| Best Student Project (Frankenstein) | LinkedIn, student email, year and degree, school name, for every team member                                                                     | everyone on the team is a current student                   |
| Best Ghost of Kiroween Past         | Confirm you registered for Kiroween 2025 (Devpost checks)                                                                                        | you registered last year                                    |
| Best Kiro Crew App                  | A write-up and a public GitHub repo of a Kiro Crew app built in the period                                                                       | you built a separate Kiro Crew app (PLANRIFT is not one)    |
| Social Blitz                        | URL of a public post that **starts with** `#KiroweenHackathon26` and says your favourite thing about Kiro and how it changed the way you develop | you post it before 4 Dec (draft in `SOCIAL_AND_BLOG.md`)    |
| Blog Prize                          | URL of a public blog post about Kiro and the build that says it was written for the Kiroween 2026 hackathon                                      | you publish it before 4 Dec (draft in `SOCIAL_AND_BLOG.md`) |

Best Demo is awarded automatically from the Presentation score.

## Eligibility checkbox

"I, and, if applicable, all of my teammates, are from an eligible jurisdiction to compete." Tick it
only if true. The rules exclude residents of the province of Quebec, Argentina, Australia, Brazil,
Italy, the Philippines, Russia, Cuba, Iran, North Korea, Syria, Belarus, Crimea, the DNR and LNR
regions, the United Arab Emirates and any other country under comprehensive US (OFAC) sanctions.
