/**
 * Build-time content for the landing page. Every value is produced by the domain engine or read
 * from the repository; nothing here is typed-in marketing data. Server-only (uses node:fs).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { doorAnalysis, pairsForDoor } from '@/domain/analysis/analyze';
import { formatDeg } from '@/domain/format';
import {
  acceptScenario,
  createScenario,
  editScenario,
  headRevision,
  initialProjectState,
  rejectScenario,
  submitForReview,
  type ProjectState,
} from '@/domain/revision/scenario';
import type { RevisionReceipt } from '@/domain/revision/receipt';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { BASELINE, solveAt } from './engine';

const SAMPLE_TIME = '2026-11-03T16:20:00.000Z';

export interface CompareColumn {
  readonly label: string;
  readonly sub: string;
  readonly hingeMm: number;
}

export const COMPARE_COLUMNS: readonly CompareColumn[] = [
  { label: 'Approved', sub: 'REV-0 baseline', hingeMm: FLAGSHIP.baselineHingeMm },
  { label: 'Revision A', sub: 'Proposal', hingeMm: FLAGSHIP.revisionAHingeMm },
  { label: 'Revision B', sub: 'Alternative', hingeMm: FLAGSHIP.revisionBHingeMm },
];

/** A real review run through the domain at build time: reject A (conflict), accept B (clear). */
export function sampleDecision(): { accepted: RevisionReceipt; rejected: RevisionReceipt } {
  const now = SAMPLE_TIME;
  let state: ProjectState = initialProjectState(structuredClone(BASELINE), '2026-10-28T09:00:00.000Z');
  const head = headRevision(state);
  const make = (id: string, label: string, name: string, mm: number) => {
    const r = editScenario(createScenario({ id, label, name, source: head, now }), { kind: 'door.hinge', doorId: FLAGSHIP.doorId, hingeOffsetMm: mm }, now);
    if (!r.ok) throw new Error(r.error);
    return r.value;
  };
  state = {
    ...state,
    scenarios: [make('S-A', 'A', 'Door at 3,000 mm', FLAGSHIP.revisionAHingeMm), make('S-B', 'B', 'Door at 2,400 mm', FLAGSHIP.revisionBHingeMm)],
  };
  const strike = doorAnalysis(solveAt(FLAGSHIP.revisionAHingeMm).analysis, FLAGSHIP.doorId)!.maxOpeningDeg ?? 90;
  const steps = [
    (s: ProjectState) => submitForReview(s, 'S-A', now),
    (s: ProjectState) => rejectScenario(s, 'S-A', { reviewer: 'Sample reviewer', note: `Leaf strikes console F-07 after ${formatDeg(strike)}.` }, now),
    (s: ProjectState) => submitForReview(s, 'S-B', now),
    (s: ProjectState) =>
      acceptScenario(s, 'S-B', { reviewer: 'Sample reviewer', note: 'Full swing clear. Reissue the flagged sheets.', acknowledgedDocuments: true }, now),
  ];
  for (const step of steps) {
    const r = step(state);
    if (!r.ok) throw new Error(r.error);
    state = r.value;
  }
  return {
    accepted: state.receipts.find((r) => r.decision.outcome === 'accepted')!,
    rejected: state.receipts.find((r) => r.decision.outcome === 'rejected')!,
  };
}

export interface KiroInventory {
  readonly specs: readonly { name: string; done: number; total: number }[];
  readonly hooks: readonly { name: string; trigger: string; file: string }[];
  readonly agents: readonly string[];
  readonly steering: readonly { name: string; inclusion: string }[];
}

/** Real inventory of the repository's .kiro folder, read when the page is built. */
export function kiroInventory(): KiroInventory | null {
  try {
    const root = path.join(process.cwd(), '.kiro');
    const specs = readdirSync(path.join(root, 'specs'))
      .filter((d) => existsSync(path.join(root, 'specs', d, 'tasks.md')))
      .sort()
      .map((name) => {
        const text = readFileSync(path.join(root, 'specs', name, 'tasks.md'), 'utf8');
        return { name, done: (text.match(/^\s*- \[x\]/gm) ?? []).length, total: (text.match(/^\s*- \[[ x-]\]/gm) ?? []).length };
      });
    const hooks = readdirSync(path.join(root, 'hooks'))
      .filter((f) => f.endsWith('.json'))
      .sort()
      .flatMap((file) => ((JSON.parse(readFileSync(path.join(root, 'hooks', file), 'utf8')).hooks as { name: string; trigger: string }[]) ?? []).map((h) => ({ ...h, file })));
    const agents = readdirSync(path.join(root, 'agents'))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => f.replace(/\.md$/, ''));
    const steering = readdirSync(path.join(root, 'steering'))
      .filter((f) => f.endsWith('.md'))
      .sort()
      .map((f) => {
        const head = readFileSync(path.join(root, 'steering', f), 'utf8').slice(0, 200);
        return { name: f.replace(/\.md$/, ''), inclusion: /inclusion:\s*(\w+)/.exec(head)?.[1] ?? 'always' };
      });
    return { specs, hooks, agents, steering };
  } catch {
    return null;
  }
}

/** Governing pair (smallest signed separation) for D-101 in a frame. */
export function governingPair(hingeMm: number) {
  return pairsForDoor(solveAt(hingeMm).analysis, FLAGSHIP.doorId)
    .filter((p) => p.separation)
    .sort((a, b) => a.separation!.valueMm - b.separation!.valueMm)[0]!;
}
