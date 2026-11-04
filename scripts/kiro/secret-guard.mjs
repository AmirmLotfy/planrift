#!/usr/bin/env node
// PreToolUse guard for file-write tools. Blocks (exit 2) writes to env/key files and content
// that looks like a credential. Prints the reason on stderr so the agent sees it.
import { readEvent, stringValues } from './lib.mjs';

const PATTERNS = [
  ['AWS access key ID', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}\b/],
  ['Vercel token', /\bvercel_[A-Za-z0-9]{24,}\b/i],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['OpenAI-style secret key', /\bsk-(live|proj|ant)?-?[A-Za-z0-9]{32,}\b/],
  ['generic secret assignment', /\b(api[_-]?key|secret|password|passwd|token)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
];

const BLOCKED_PATH = /(^|\/)(\.env(\.[^/]*)?|id_rsa|id_ed25519|[^/]*\.pem|[^/]*\.key)$/;

const event = await readEvent();
const input = event.tool_input ?? {};
const path = String(input.path ?? input.file_path ?? input.targetFile ?? '');

if (path && BLOCKED_PATH.test(path) && !path.endsWith('.env.example')) {
  console.error(`Blocked: writing to ${path} is not allowed. Keep secrets out of the repository (see .kiro/steering/security.md).`);
  process.exit(2);
}

for (const text of stringValues(input)) {
  for (const [label, pattern] of PATTERNS) {
    if (pattern.test(text)) {
      console.error(`Blocked: the content looks like a ${label}. Secrets must never be written to the workspace. If this is a false positive, rephrase the content.`);
      process.exit(2);
    }
  }
}
process.exit(0);
