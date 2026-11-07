# Submission checklist

Deadline: **Friday 4 December 2026, 2:00 PM Pacific.** Updated 2026-11-07.

## Done

- [x] Working app at https://planrift-omega.vercel.app, free, no login; `/` and `/demo` load with no console errors
- [x] MIT `LICENSE` at the repo root
- [x] `.kiro/` tracked and not git-ignored (specs, steering, agents, hooks)
- [x] README with live link, install, test commands, limitations and Kiro usage
- [x] Secret scan of tracked files and full history: clean
- [x] `tsc`, ESLint, 83 unit tests and 13 Playwright checks (desktop + phone, axe) pass: `docs/evidence/2026-11-04-verification.md`
- [x] 14 screenshots captured from the deployed app: `docs/submission/screenshots/`
- [x] Voiceover script: `VO_SCRIPT.md`; music and SFX prompts: `MUSIC_PROMPT.md`; storyboard: `VIDEO.md`
- [x] Devpost text drafted: `DEVPOST.md`

## Needs you

- [ ] Send VO-01…VO-18, room tone and music (plus optional SFX and Kiro IDE clips) to `video/inbox/`
- [ ] Approve the finished video, upload it to YouTube as Public with the generated captions, send me the URL
- [ ] Say "make the repo public" (I will re-run the secret scan first)
- [ ] Review `DEVPOST.md`, then say "submit" (or paste it into Devpost yourself)

## Final checks I will run after those

- [ ] Repo shows MIT in the About section while logged out; `.kiro` visible at the root
- [ ] App URL and video play in a logged-out browser; video length verified
- [ ] Devpost entry shows as submitted on the hackathon page

## Known limits to state if asked

- Performance was only measured with software rendering; not tested on Safari or Firefox.
- WCAG conformance needs manual assistive-technology testing beyond the automated checks.
- Sample project is fictional; the tool simplifies rooms to rectangles and single-leaf 90° doors.
