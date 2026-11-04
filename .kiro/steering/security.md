---
inclusion: always
---

# Security and data handling

- No secrets in code, steering, specs, logs or commits. `.env*` files are git-ignored and a
  PreToolUse hook blocks writes that look like credentials.
- Imported files are untrusted data: size limit (2 MB), `JSON.parse` only, strict zod schemas
  (unknown keys rejected, integer mm, bounded strings and arrays), referential integrity and
  fingerprint verification. Never execute, `eval`, or fetch anything named in an import.
- Rendered strings go through React (escaped). Generated HTML (receipt) escapes every value.
- CSV cells starting with `= + - @ tab CR` are prefixed with `'` (formula injection).
- No third-party network calls at runtime: no analytics, remote fonts, CDNs or HDR environment
  maps. CSP in `next.config.ts` enforces `default-src 'self'`.
- Browser storage holds only the user's own project state, versioned and schema-validated on
  load; a corrupt or old payload is discarded with a visible notice, never partially trusted.
- Account actions (GitHub repo creation or publication, Vercel deploys, YouTube upload, Devpost
  submission) need explicit user approval in chat. Never request passwords, cookies or 2FA codes.
