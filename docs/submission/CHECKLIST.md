# Submission checklist

Deadline: **Friday 4 December 2026, 2:00 PM Pacific.** Updated 2026-11-08.

## Done

- [x] Working app at https://planrift-omega.vercel.app, free, no login; `/` and `/demo` load with no console errors
- [x] MIT `LICENSE` at the repo root
- [x] `.kiro/` tracked and not git-ignored (specs, steering, agents, hooks)
- [x] README with live link, install, test commands, limitations and Kiro usage
- [x] Secret scan of tracked files and full history: clean
- [x] `tsc`, ESLint, unit and property tests and 13 Playwright checks (desktop + phone, axe) pass: `docs/evidence/`
- [x] 14 screenshots from the deployed app: `docs/submission/screenshots/`
- [x] Demo video, 2:48: `video/out/planrift-demo-1440p.mp4`; captions `captions.srt`; thumbnails in `video/out/`
- [x] Every Devpost field written: `DEVPOST.md`; YouTube copy and settings: `YOUTUBE.md`
- [x] Thumbnail prompts: `THUMBNAIL_PROMPTS.md`; Social Blitz and blog drafts: `SOCIAL_AND_BLOG.md`

## Needs you

- [ ] Watch the video once, start to finish, and tell me what to change (if anything)
- [ ] Confirm your voice and music generator plan allows commercial use (keep a screenshot)
- [ ] Upload to YouTube as **Public**, embedding on, with `captions.srt` and `thumb-youtube.jpg`; send me the URL
- [ ] Say "make the repo public" (I re-run the secret scan first, then check the licence and `.kiro` on the repo page)
- [ ] Approve a final production deploy, so the landing page shows the updated spec task counts
- [ ] Optional bonuses before 4 Dec: post the Social Blitz text (must start with `#KiroweenHackathon26`) and publish the blog post (must mention Kiroween 2026)
- [ ] Fill the Devpost form from `DEVPOST.md`, tick eligibility only if it applies to you, then submit (or tell me to)

## Final checks after those

- [ ] Repo shows MIT in the About section while logged out; `.kiro` visible at the root
- [ ] App URL and video play in a logged-out browser
- [ ] Devpost entry shows as submitted on the hackathon page
- [ ] The app stays online until judging ends (29 January 2027)

## Known limits to state if asked

- Performance was only measured with software rendering; not tested on Safari or Firefox.
- WCAG conformance needs manual assistive-technology testing beyond the automated checks.
- The sample project is fictional; the tool simplifies rooms to rectangles and single-leaf 90° doors.
