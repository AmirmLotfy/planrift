/**
 * Build-time content for the landing page. Every value is produced by the domain engine or read
 * from the repository; nothing here is typed-in marketing data. Server-only (uses node:fs).
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { doorAnalysis, pairsForDoor, type IssueCode, type PairStatus } from '@/domain/analysis/analyze';
import { formatDeg } from '@/domain/format';
import type { DocumentRef } from '@/domain/model/types';
import type { ImpactRecord } from '@/domain/revision/impact';
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
import { BASELINE, headlineFor, solveAt, type Frame } from './engine';

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

export interface KiroHook {
  readonly name: string;
  readonly trigger: string;
  readonly file: string;
  readonly description: string;
  readonly matcher: string | null;
  readonly command: string | null;
}

export interface KiroInventory {
  readonly specs: readonly { name: string; done: number; total: number }[];
  readonly hooks: readonly KiroHook[];
  readonly agents: readonly string[];
  readonly steering: readonly { name: string; inclusion: string }[];
}

interface RawHook {
  name: string;
  trigger: string;
  description?: string;
  matcher?: string;
  action?: { type?: string; command?: string };
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
      .flatMap((file) =>
        ((JSON.parse(readFileSync(path.join(root, 'hooks', file), 'utf8')).hooks as RawHook[] | undefined) ?? []).map(
          (h): KiroHook => ({
            name: h.name,
            trigger: h.trigger,
            file,
            description: h.description ?? '',
            matcher: h.matcher ?? null,
            command: h.action?.type === 'command' ? (h.action.command ?? null) : null,
          }),
        ),
      );
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

let decisionMemo: ReturnType<typeof sampleDecision> | null = null;
function decision() {
  decisionMemo ??= sampleDecision();
  return decisionMemo;
}

/* ---------- Compare sheet ---------- */

export interface CompareSheetColumn extends CompareColumn {
  readonly frame: Frame;
  /** Hinge movement relative to the approved column. */
  readonly deltaMm: number;
  readonly status: PairStatus;
  readonly headline: string;
  readonly maxOpeningDeg: number | null;
  /** Signed separation between the swing and the console (negative = intrusion). */
  readonly console: { readonly furnitureId: string; readonly separationMm: number; readonly status: PairStatus } | null;
  readonly documents: readonly string[];
  /** Sample review receipt for this position, when it was decided. */
  readonly receipt: RevisionReceipt | null;
}

/** The three compared positions, each solved by the engine, plus the sample decisions. */
export function compareSheet(): { columns: CompareSheetColumn[]; sourceRevisionId: string } {
  const { accepted, rejected } = decision();
  const base = COMPARE_COLUMNS[0]!.hingeMm;
  const columns = COMPARE_COLUMNS.map((col): CompareSheetColumn => {
    const frame = solveAt(col.hingeMm);
    const door = doorAnalysis(frame.analysis, FLAGSHIP.doorId)!;
    const pair = pairsForDoor(frame.analysis, FLAGSHIP.doorId).find((p) => p.furnitureId === FLAGSHIP.consoleId);
    const receipt =
      [accepted, rejected].find((r) => r.changes.some((c) => c.elementId === FLAGSHIP.doorId && c.field === 'hingeOffsetMm' && c.after === col.hingeMm)) ?? null;
    return {
      ...col,
      frame,
      deltaMm: col.hingeMm - base,
      status: door.status,
      headline: headlineFor(frame),
      maxOpeningDeg: door.maxOpeningDeg,
      console: pair?.separation ? { furnitureId: pair.furnitureId, separationMm: pair.separation.valueMm, status: pair.status } : null,
      documents: frame.impacts.map((i) => i.documentId),
      receipt,
    };
  });
  return { columns, sourceRevisionId: accepted.source.revisionId };
}

/* ---------- Review documents ---------- */

export type SheetView = 'plan' | 'elevation' | 'schedule';

export interface ReviewSheet {
  readonly impact: ImpactRecord;
  /** The document as issued (baseline metadata). */
  readonly document: DocumentRef;
  /** Which miniature to draw, derived from the document kind and title. */
  readonly view: SheetView;
}

/**
 * Revision B's document consequences: the impact records computed by the engine, the accepted
 * sample receipt, and the documents and rooms that received no record.
 */
export function reviewSet() {
  const { accepted } = decision();
  const issued = solveAt(FLAGSHIP.baselineHingeMm);
  const proposal = solveAt(FLAGSHIP.revisionBHingeMm);
  const documents = new Map(BASELINE.documents.map((d) => [d.id, d]));
  const sheets: ReviewSheet[] = proposal.impacts.map((impact) => {
    const document = documents.get(impact.documentId)!;
    const view: SheetView = document.kind === 'schedule' ? 'schedule' : /elevation/i.test(document.title) ? 'elevation' : 'plan';
    return { impact, document, view };
  });
  const flagged = new Set(proposal.impacts.map((i) => i.documentId));
  const touchedRooms = new Set(proposal.impacts.flatMap((i) => i.reasons.map((r) => r.roomId)));
  return {
    receipt: accepted,
    issued,
    proposal,
    sheets,
    untouchedDocuments: BASELINE.documents.filter((d) => !flagged.has(d.id)),
    untouchedRooms: BASELINE.rooms.filter((r) => !touchedRooms.has(r.id)).map((r) => r.id),
  };
}

/* ---------- Kiro hook pipeline ---------- */

/**
 * Plain-language reading of each hook file, in the order they fire during a Kiro session.
 * Only hooks that exist in .kiro/hooks are shown; the trigger, description and command come
 * from the hook JSON itself.
 */
export const HOOK_STEPS: readonly { readonly file: string; readonly when: string; readonly then: string; readonly gate: boolean }[] = [
  { file: 'session-resume.json', when: 'Session starts', then: 'Resume summary from the repository', gate: false },
  { file: 'task-start-gate.json', when: 'Spec task starts', then: 'Type-check gate', gate: true },
  { file: 'secret-guard.json', when: 'Agent writes a file', then: 'Credentials are blocked', gate: true },
  { file: 'geometry-regression.json', when: 'Agent edits src/domain', then: 'Geometry tests run', gate: false },
  { file: 'public-action-guard.json', when: 'Shell: deploy or push', then: 'Asks you first', gate: true },
  { file: 'task-completion-gate.json', when: 'Spec task ends', then: 'Typecheck · lint · tests', gate: false },
];

/* ---------- Limits ---------- */

export type LimitGlyph = 'room' | 'door' | 'furniture' | 'scenarios' | 'exports' | 'compliance' | 'approval' | 'cad' | 'edits' | 'shapes';

export interface LimitItem {
  readonly glyph: LimitGlyph;
  readonly title: string;
  readonly detail: string;
  /** Engine issue codes that report this case as Unsupported instead of guessing. */
  readonly codes?: readonly IssueCode[];
}

export const LIMITS: { readonly modelled: readonly LimitItem[]; readonly notClaimed: readonly LimitItem[] } = {
  modelled: [
    { glyph: 'room', title: 'Rectangular rooms', detail: 'Axis-aligned rooms with wall thickness per side, in whole millimetres.' },
    { glyph: 'door', title: 'Single-leaf hinged doors', detail: 'A 90° inward swing, tested at every whole-millimetre hinge position.' },
    { glyph: 'furniture', title: 'Rectangular furniture', detail: 'Unrotated footprints, checked against the full swept sector.' },
    { glyph: 'scenarios', title: 'Scenarios, comparison, receipts', detail: 'Branch from the approved revision, compare side by side, record the decision.' },
    { glyph: 'exports', title: 'Exports', detail: 'Project JSON, impact ledger CSV, printable HTML receipt, plan SVG.' },
  ],
  notClaimed: [
    { glyph: 'compliance', title: 'Code, accessibility or egress compliance', detail: 'Clearances describe the modelled geometry only.' },
    { glyph: 'approval', title: 'Approval to build', detail: 'A receipt records a review. It is not a certificate.' },
    { glyph: 'cad', title: 'DWG, DXF, IFC or Revit', detail: 'No CAD or BIM import or export.' },
    { glyph: 'edits', title: 'Automatic drawing edits', detail: 'Flagged sheets are revised and re-issued by the design team.' },
    {
      glyph: 'shapes',
      title: 'Rotated furniture, sliding doors, 3D clash',
      detail: 'Reported as Unsupported, never guessed.',
      codes: ['furniture.unsupported-rotation', 'door.unsupported-operation'],
    },
  ],
};

/* ---------- Footer title block ---------- */

/** The site's own revision table (this build), shown in the footer title block. */
export const SITE_REVISIONS: readonly { readonly rev: string; readonly date: string; readonly description: string }[] = [
  { rev: 'A', date: '2026-11-04', description: 'Kiroween 2026 build' },
];
