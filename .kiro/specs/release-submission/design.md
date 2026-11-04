# Design — Release and submission

- Approval gate: `.kiro/hooks/public-action-guard.json` asks before `vercel`, `gh repo …`,
  `git push`, `npm publish`. The release-producer agent never bypasses it.
- Authentication: the user runs `vercel login` and `gh auth login` in their own terminal.
- Order: verify → first deploy (13 Nov) → Devpost draft → freeze (24 Nov) → final deploy →
  secret scan → private repo push → public → screenshots → video → YouTube → Devpost submit →
  audit.
- Files: `docs/submission/CHECKLIST.md`, `DEVPOST.md`, `VIDEO.md`, `screenshots/`.
