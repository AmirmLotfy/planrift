#!/usr/bin/env node
// PreToolUse guard for shell commands.
// - Public or account-level actions (deploys, repo creation/visibility, pushes, releases)
//   always ask the user first, matching the approval policy in .kiro/steering/security.md.
// - `git commit` is gated on a passing type check so broken code is never committed.
import { execSync } from 'node:child_process';
import { readEvent } from './lib.mjs';

const event = await readEvent();
const command = String(event.tool_input?.command ?? '');

const PUBLIC_ACTIONS = [
  [/\bvercel\b(?!\s+(--version|-v|whoami|ls|inspect|env\s+ls)\b)/, 'Vercel deploy or project change'],
  [/\bgh\s+repo\s+(create|edit|delete|rename|archive)\b/, 'GitHub repository creation or settings change'],
  [/\bgh\s+release\s+create\b/, 'GitHub release'],
  [/\bgit\s+push\b/, 'git push to a remote'],
  [/\bnpm\s+publish\b/, 'npm publish'],
];

for (const [pattern, label] of PUBLIC_ACTIONS) {
  if (pattern.test(command)) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          permissionDecision: 'ask',
          permissionDecisionReason: `${label} requires explicit user approval (PLANRIFT release policy).`,
        },
      }),
    );
    process.exit(0);
  }
}

if (/\bgit\s+commit\b/.test(command)) {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe', timeout: 110_000 });
  } catch (error) {
    const output = `${error.stdout ?? ''}${error.stderr ?? ''}`.split('\n').slice(0, 30).join('\n');
    console.error(`Blocked: the type check fails, so the commit was not made.\n${output}`);
    process.exit(2);
  }
}
process.exit(0);
