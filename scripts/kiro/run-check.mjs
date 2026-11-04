#!/usr/bin/env node
// Runs npm scripts for hooks. Success: one summary line on stdout, exit 0.
// Failure: the tail of the output on stderr (forwarded to the agent), exit 1.
// Usage: node scripts/kiro/run-check.mjs <npm-script> [<npm-script> ...] [--format-changed]
import { execSync } from 'node:child_process';

const args = process.argv.slice(2);
const formatChanged = args.includes('--format-changed');
// --block: exit 2 on failure, which blocks PreTaskExec / PreToolUse events.
const failCode = args.includes('--block') ? 2 : 1;
const scripts = args.filter((a) => !a.startsWith('--'));
const started = Date.now();

function run(cmd) {
  return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 240_000, env: { ...process.env, CI: '1', FORCE_COLOR: '0' } });
}

for (const script of scripts) {
  try {
    run(`npm run --silent ${script}`);
  } catch (error) {
    const output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim().split('\n');
    console.error(`[planrift hook] npm run ${script} FAILED. Fix before continuing.\n${output.slice(-60).join('\n')}`);
    process.exit(failCode);
  }
}

if (formatChanged) {
  let files = [];
  try {
    files = run('git diff --name-only --diff-filter=ACMR HEAD')
      .split('\n')
      .filter((f) => /\.(ts|tsx|css|mjs|json|md)$/.test(f) && !f.startsWith('docs/evidence/'));
  } catch {
    files = [];
  }
  if (files.length) {
    try {
      run(`npx prettier --check ${files.map((f) => JSON.stringify(f)).join(' ')}`);
    } catch (error) {
      console.error(`[planrift hook] Formatting differs from Prettier in changed files. Run: npm run format\n${String(error.stdout ?? '').slice(0, 2000)}`);
      process.exit(failCode);
    }
  }
}

console.log(`[planrift hook] ${scripts.join(', ') || 'checks'} passed in ${((Date.now() - started) / 1000).toFixed(1)} s`);
