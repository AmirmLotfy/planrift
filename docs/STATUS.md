# PLANRIFT — Build Status

Resume point for any new Kiro session. Update at every phase boundary. Evidence lives in
`docs/evidence/`. Statuses: Planned · In progress · Implemented · Tested · Verified · Released.

Last updated: 2026-11-05

## Decisions (user-confirmed 2026-11-04)

- Hosting: Vercel + GitHub. Repo private during build, public at release after a secret scan and
  explicit approval. The user runs `vercel login` and `gh auth login` personally.
- Video: the user records the voiceover; Kiro prepares the script, shot list and captions.
- Research: proceed with defaults; recheck Navisworks / Revit / Bluebeam / Rayon in a real browser.
- Approval required before: public deploy, repo creation/publication, video upload, Devpost submit,
  any spending or account-level change.

## Toolchain (verified on this machine)

Node 22.13.1 · npm 10.9.2 · git 2.50.1 · gh 2.92.0 · vercel 48.4.0 · macOS 26.6.2 arm64.
Pinned: next 16.4.5 · react 19.3.1 · three 0.187.0 · @react-three/fiber 9.8.2 · drei 10.7.9 ·
zod 4.6.7 · zustand 5.0.16 · typescript 6.0.3 (typescript-eslint requires < 6.1) · eslint 9.39.5
(plugins cap at v9) · vitest 5.1.0 · vite 8.3.5 · fast-check 4.10.2 · @playwright/test 1.64.1 ·
jsdom 26.1.0 (jsdom 30 needs Node >= 22.22).

## Progress
| Phase | Status | Evidence |
|---|---|---|
| Geometry engine, revision model, IO | Tested | 83 unit tests, docs/evidence/2026-11-04-verification.md |
| Render models (plan + 3D) | Tested | tests/render agreement tests |
| Landing: white-model hero, scroll story, sections | Verified | e2e + screenshots, desktop and phone |
| Studio (/demo) incl. 3D Model view | Verified | e2e + axe, desktop and phone |
| Kiro assets (specs, steering, agents, hooks) | Implemented | .kiro/ |
| README, MIT licence | Implemented | README.md, LICENSE |
| GitHub repo, Vercel deploy | Waiting on user | needs vercel login, gh auth login and approval |
| Demo video, Devpost copy | Not started | user records the voiceover |

## Next
1. User: `vercel login`, `gh auth login`, then approve repo creation and deploy.
2. Capture release screenshots and write the demo script and shot list.
3. Draft Devpost text; submit only after explicit approval (deadline Fri 4 Dec 2026, 2:00 PM PT).
