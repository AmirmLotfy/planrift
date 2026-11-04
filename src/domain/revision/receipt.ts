/**
 * Revision receipt: a self-contained review artifact. It records what changed, what was
 * computed, which documents need review, the limitations of the model, and the decision.
 * It is not a construction certificate or a compliance statement.
 */

import { ENGINE_VERSION, type PairStatus } from '../analysis/analyze';
import { fingerprint } from '../io/canonical';
import type { AnalysisSettings } from '../model/types';
import { describeFieldChange } from './diff';
import type { ImpactRecord } from './impact';
import type { DecisionInput, ScenarioEvaluation } from './scenario';

export const MODEL_LIMITATIONS: readonly string[] = [
  'Geometry is a simplified plan model: axis-aligned rectangular rooms and footprints, single-leaf hinged doors with a 90° inward swing.',
  'Door hardware, frames, stops, skirting, finishes and construction tolerances are not modelled.',
  'Clearance results describe the modelled geometry only. They are not a building-code, accessibility or egress compliance check.',
  'Linked drawings and schedules are references authored in PLANRIFT. PLANRIFT has not modified them; they must be revised and re-issued by the design team.',
];

export interface ReceiptChange {
  readonly elementId: string;
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
  readonly description: string;
}

export interface ReceiptPair {
  readonly roomId: string;
  readonly doorId: string;
  readonly furnitureId: string;
  readonly status: PairStatus;
  readonly separationMm: number | null;
  readonly firstStrikeDeg: number | null;
}

export interface RevisionReceipt {
  readonly format: 'planrift.receipt';
  readonly version: 1;
  readonly id: string;
  readonly project: { readonly id: string; readonly name: string };
  readonly scenario: { readonly id: string; readonly label: string; readonly name: string; readonly remarks: string };
  readonly source: { readonly revisionId: string; readonly fingerprint: string };
  readonly result: { readonly revisionId: string | null; readonly fingerprint: string };
  readonly changes: readonly ReceiptChange[];
  readonly analysis: {
    readonly engineVersion: string;
    readonly status: PairStatus;
    readonly settings: AnalysisSettings;
    readonly doors: readonly { readonly doorId: string; readonly status: PairStatus; readonly maxOpeningDeg: number | null }[];
    readonly pairs: readonly ReceiptPair[];
  };
  readonly impacts: readonly ImpactRecord[];
  readonly decision: {
    readonly outcome: 'accepted' | 'rejected';
    readonly reviewer: string;
    readonly note: string;
    readonly decidedAt: string;
    readonly acknowledgedDocuments: boolean;
  };
  readonly limitations: readonly string[];
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function buildReceipt(input: {
  evaluation: ScenarioEvaluation;
  outcome: 'accepted' | 'rejected';
  input: DecisionInput;
  decidedAt: string;
  resultRevisionId: string | null;
}): RevisionReceipt {
  const { evaluation } = input;
  const { scenario, source, analysis, diff, impacts } = evaluation;
  const changedRooms = new Set(diff.fields.map((c) => c.roomId));
  const resultFingerprint = fingerprint(scenario.scene);
  const pairs: ReceiptPair[] = analysis.rooms
    .filter((r) => changedRooms.has(r.roomId))
    .flatMap((r) => r.pairs)
    .map((p) => ({
      roomId: p.roomId,
      doorId: p.doorId,
      furnitureId: p.furnitureId,
      status: p.status,
      separationMm: p.separation ? round1(p.separation.valueMm) : null,
      firstStrikeDeg: p.strike && (p.status === 'CONFLICT' || p.status === 'CONTACT_REVIEW') ? round1(p.strike.firstDeg) : null,
    }));
  return {
    format: 'planrift.receipt',
    version: 1,
    id: `RCPT-${resultFingerprint.slice(0, 8).toUpperCase()}-${input.outcome === 'accepted' ? 'A' : 'R'}${scenario.label}`,
    project: { id: scenario.scene.project.id, name: scenario.scene.project.name },
    scenario: { id: scenario.id, label: scenario.label, name: scenario.name, remarks: scenario.remarks },
    source: { revisionId: source.id, fingerprint: source.fingerprint },
    result: { revisionId: input.resultRevisionId, fingerprint: resultFingerprint },
    changes: diff.fields.map((c) => ({ elementId: c.elementId, field: c.field, before: c.before, after: c.after, description: describeFieldChange(c) })),
    analysis: {
      engineVersion: ENGINE_VERSION,
      status: analysis.status,
      settings: analysis.settings,
      doors: analysis.rooms
        .filter((r) => changedRooms.has(r.roomId))
        .flatMap((r) => r.doors)
        .map((d) => ({ doorId: d.doorId, status: d.status, maxOpeningDeg: d.maxOpeningDeg === null ? null : round1(d.maxOpeningDeg) })),
      pairs,
    },
    impacts,
    decision: {
      outcome: input.outcome,
      reviewer: input.input.reviewer.trim(),
      note: input.input.note.trim(),
      decidedAt: input.decidedAt,
      acknowledgedDocuments: input.input.acknowledgedDocuments,
    },
    limitations: MODEL_LIMITATIONS,
  };
}
