#!/usr/bin/env node
// SessionStart: prints a compact resume summary so a fresh session starts from real state.
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const lines = ['PLANRIFT resume summary (from repository state):'];
const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return '';
  }
};

const branch = sh('git rev-parse --abbrev-ref HEAD');
const last = sh('git log -1 --format="%h %s (%cr)"');
const dirty = sh('git status --porcelain').split('\n').filter(Boolean).length;
if (branch) lines.push(`- git: ${branch} · last commit ${last} · ${dirty} uncommitted path(s)`);

const specsDir = '.kiro/specs';
if (existsSync(specsDir)) {
  for (const spec of readdirSync(specsDir)) {
    const tasks = join(specsDir, spec, 'tasks.md');
    if (!existsSync(tasks)) continue;
    const text = readFileSync(tasks, 'utf8');
    const done = (text.match(/^\s*- \[x\]/gm) ?? []).length;
    const open = (text.match(/^\s*- \[ \]/gm) ?? []).length;
    const active = (text.match(/^\s*- \[-\]/gm) ?? []).length;
    lines.push(`- spec ${spec}: ${done} done · ${active} in progress · ${open} open`);
  }
}

if (existsSync('docs/STATUS.md')) {
  const status = readFileSync('docs/STATUS.md', 'utf8');
  const table = status.split('## Progress')[1];
  if (table) lines.push('- progress (docs/STATUS.md):', ...table.trim().split('\n').slice(2, 30).map((l) => `  ${l}`));
}
lines.push('Read docs/STATUS.md and docs/plan/MASTER_PLAN.md before starting new work.');
console.log(lines.join('\n'));
