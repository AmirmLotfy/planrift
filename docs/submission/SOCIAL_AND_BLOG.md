# Bonus prizes: Social Blitz post and blog post (drafts)

Both are optional and must be published **before 4 December 2026, 2:00 PM PT**. Paste each URL into
its Devpost field. Edit freely so they sound like you; keep the required parts marked below.

## Social Blitz

Rules: a public post on any social platform; it must **start with** `#KiroweenHackathon26`; it must
say your favourite thing about Kiro and how it changed the way you approached development.

### X (272 of 280 characters; links count as 23)

```
#KiroweenHackathon26 My favourite thing about Kiro: hooks. One blocked any write that looked like a secret; another kept a spec task open until types, lint and tests passed. I stopped reviewing for slips and started reviewing ideas. Built PLANRIFT: https://planrift-omega.vercel.app
```

Attach `video/out/thumb-youtube.jpg` or a 20-second clip from the video.

### LinkedIn

```
#KiroweenHackathon26

My favourite thing about Kiro is agent hooks.

For Kiroween I built PLANRIFT, a studio that shows what a design revision breaks before it is issued. Move a door on a plan and the engine computes its swing against the furniture to the millimetre, flags the drawings that need review, and records the decision.

Six hooks shaped how I worked with the agent:
• a spec task could not start while the type check failed, and could not finish until type check, lint and tests passed
• any file write that looked like a credential was blocked
• every edit to the geometry engine re-ran its tests
• nothing was deployed, pushed or committed without asking me

That changed my approach. I stopped reading every diff for slips and spent my review time on decisions: what the product may claim, and what it must call "Unsupported".

Five specs, nine steering files and seven custom agents did the rest.

Try it, no sign-in: https://planrift-omega.vercel.app
Code: https://github.com/AmirmLotfy/planrift
Video: <YouTube link>
```

---

## Blog post

Rules: a public post about Kiro and your project build, on any third-party blog platform (for
example dev.to, Medium, Hashnode or AWS Builder Center), published in the submission period. It
**must say it was written for the Kiroween 2026 hackathon** (first paragraph below).

Suggested title: **Building PLANRIFT for Kiroween 2026: one door, three drawings, and the hooks that kept an AI agent honest**

Suggested tags: `kiro`, `kiroween`, `ai`, `typescript`, `architecture`

```markdown
_I wrote this post as part of the Kiroween 2026 hackathon._

Every architect has a version of this story. A door moves a metre on a revision. The drawings go out. The first time someone opens that door on site, it slams into the furniture.

The check itself is not hard. Draw the swing, see whether it hits anything. What gets missed is that a small move changed the answer, and that the floor plan, the room elevation and the door schedule now all disagree with what was issued. For Kiroween I built [PLANRIFT](https://planrift-omega.vercel.app), a place to rehearse a revision before it goes out.

## What it does

PLANRIFT works on simplified room geometry: rectangular rooms, single-leaf doors that swing 90°, furniture as rectangles. In the fictional sample project, door D-101 has an 850 mm leaf and opens toward a console, F-07.

- In the approved plan the hinge sits at 1,700 mm and the door clears the console by 1,083.7 mm.
- Revision A moves the hinge to 3,000 mm. The leaf strikes the console after opening 15.7° and would push 188.7 mm into it.
- Revision B tries 2,400 mm: a full swing, 391.5 mm clear.

Each change flags the three drawings that show the door, A-101, A-401 and D-01, as _Review required_. PLANRIFT never edits them, and the sheet for the room next door stays unflagged. You compare the revisions side by side, submit one for review, acknowledge the flagged sheets and accept. The decision becomes a receipt with fingerprints of the scene before and after.

The Kiroween category I entered is Frankenstein: stitch together technologies that don't usually live together. PLANRIFT joins a CAD-style plan editor, a computational-geometry engine, a live WebGL room, revision control, a document ledger and an audit trail. They all read one scene and one analysis, so a single edit flows through all of them.

## Exact means exact

The engine computes a signed separation between the door's swept quarter-disc and each rectangle. The tempting implementation uses floating point everywhere and compares against a tolerance. The problem is the boundary: a door that sits exactly at the limit must not flip between _Pass_ and _Conflict_ because of rounding.

So every status is decided by an integer predicate. For Revision A the nearest corner of the console is 620 mm and 230 mm from the hinge:

    s = √(620² + 230²) − 850 = √437,300 − 850 = −188.71 mm
    437,300 < 849² = 720,801  ⇒  s < −1 mm  ⇒  Conflict

Floats are only used for the number you read on screen. A hand-computed contract (`docs/geometry/GEOMETRY_CONTRACT.md`) came first, and the tests compare the engine against independent oracles rather than against its own formulas.

## How Kiro shaped the build

I started from an empty folder and wrote the specs before any UI existed. There are five: the geometry engine, the revision workflow, the studio, quality assurance and release. Each has requirements in EARS form ("WHEN …, THE System SHALL …"), a design and a task list.

**Steering** carried the rules I didn't want to repeat in every prompt. The always-on files hold the product's truthfulness rules: every status comes from the engine, unsupported cases say _Unsupported_ and never _Pass_, and the app never claims code compliance or that it updated a drawing. Others load only when the agent touches matching files, such as the geometry rules for `src/domain/**` and the accessibility rules for components.

**Custom agents** gave each kind of work its own scope: a geometry engineer for the solver and its property tests, a frontend engineer, a 3D engineer, a design director for visual QA, a QA engineer for Playwright and axe, a release producer, and a read-only architecture reviewer that checks no displayed status bypasses the engine.

**Hooks** are my favourite part, and they changed how I worked. A spec task cannot start while the type check fails. When a task finishes, type check, lint and tests run. Any file write that looks like a credential is blocked. Saving a file in the engine re-runs the geometry tests. Anything that deploys, pushes or commits asks me first. Once those gates existed I stopped reading every diff for slips and spent my attention on decisions instead.

The landing page reads `.kiro/` when it is built and shows the specs, agents, steering files and hooks in the order they fire, so the process is visible in the product.

## Two views that cannot disagree

The studio shows the room as an SVG plan and as a WebGL "white model" built with React Three Fiber. Both are rendered from the same `(scene, analysis)` pair, and a test checks that they agree. You can drag the door in either view; the engine re-solves on every move.

## Recording the demo

Real-time screen recording of WebGL on a laptop without a GPU stutters. Instead, the demo video was recorded frame by frame with Playwright: the page clock is frozen, advanced by 1/30 s per frame, CSS animations are seeked to the same virtual time, and each screenshot goes straight into ffmpeg. The edit is in Remotion, and its opening animation is drawn from the engine's real output for Revision A.

## What I learned

Honest scope is a feature. _Unsupported_ is better than a confident wrong answer, and flagging a drawing for a person is better than pretending to update it. And with an AI agent, the gates you set up front matter more than the prompts you write later.

- Try it (no sign-in): https://planrift-omega.vercel.app
- Code (MIT, `.kiro/` included): https://github.com/AmirmLotfy/planrift
- Video: <YouTube link>
```
