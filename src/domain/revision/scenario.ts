/**
 * Revision model: committed revisions (immutable snapshots), proposal scenarios with
 * undo/redo, and the review lifecycle. Pure functions over immutable data.
 *
 * Lifecycle:  draft ──submit──▶ ready_for_review ──accept──▶ accepted
 *                ▲                   │  └────reject──▶ rejected
 *                └────return─────────┘
 * Accepting a scenario commits its scene as a new revision and supersedes the other open
 * scenarios that branched from the same source revision.
 */

import { analyzeScene, type PairStatus, type SceneAnalysis } from '../analysis/analyze';
import { fingerprint } from '../io/canonical';
import { MAX_COORD_MM, sceneSchema } from '../model/schema';
import type { Door, Scene } from '../model/types';
import { diffScenes, isEmptyDiff, type SceneDiff } from './diff';
import { computeImpacts, type ImpactRecord } from './impact';
import { buildReceipt, type RevisionReceipt } from './receipt';

export type ScenarioStatus = 'draft' | 'ready_for_review' | 'accepted' | 'rejected' | 'superseded';

export interface Decision {
  readonly outcome: 'accepted' | 'rejected';
  readonly reviewer: string;
  readonly note: string;
  readonly decidedAt: string;
  readonly receiptId: string;
}

export interface Scenario {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly sourceRevisionId: string;
  readonly scene: Scene;
  readonly past: readonly Scene[];
  readonly future: readonly Scene[];
  readonly status: ScenarioStatus;
  readonly remarks: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decision: Decision | null;
}

export interface CommittedRevision {
  readonly id: string;
  readonly label: string;
  readonly scene: Scene;
  readonly fingerprint: string;
  readonly committedAt: string;
  readonly fromScenarioId: string | null;
  readonly receiptId: string | null;
  readonly summary: string;
}

export interface ProjectState {
  readonly revisions: readonly CommittedRevision[];
  readonly scenarios: readonly Scenario[];
  readonly receipts: readonly RevisionReceipt[];
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

export const UNDO_LIMIT = 200;

export type Edit =
  | { readonly kind: 'door.hinge'; readonly doorId: string; readonly hingeOffsetMm: number }
  | { readonly kind: 'door.leafWidth'; readonly doorId: string; readonly leafWidthMm: number }
  | { readonly kind: 'door.leafDirection'; readonly doorId: string; readonly leafDirection: Door['leafDirection'] }
  | { readonly kind: 'door.swingDeg'; readonly doorId: string; readonly swingDeg: number }
  | { readonly kind: 'door.swingSide'; readonly doorId: string; readonly swingSide: Door['swingSide'] };

function integerIn(value: number, min: number, max: number, label: string): string | null {
  if (!Number.isFinite(value)) return `${label} must be a finite number.`;
  if (!Number.isInteger(value)) return `${label} must be a whole number of millimetres.`;
  if (value < min || value > max) return `${label} must be between ${min} and ${max}.`;
  return null;
}

/** Applies an edit to a scene. Structural validity is enforced; semantic validity is analysed. */
export function applyEdit(scene: Scene, edit: Edit): Result<Scene> {
  const located = scene.rooms.find((r) => r.doors.some((d) => d.id === edit.doorId));
  if (!located) return fail(`Door ${edit.doorId} does not exist.`);
  let error: string | null = null;
  const patch: Partial<Door> = {};
  switch (edit.kind) {
    case 'door.hinge':
      error = integerIn(edit.hingeOffsetMm, -MAX_COORD_MM, MAX_COORD_MM, 'Hinge position');
      patch.hingeOffsetMm = edit.hingeOffsetMm;
      break;
    case 'door.leafWidth':
      error = integerIn(edit.leafWidthMm, 1, MAX_COORD_MM, 'Leaf width');
      patch.leafWidthMm = edit.leafWidthMm;
      break;
    case 'door.leafDirection':
      patch.leafDirection = edit.leafDirection;
      break;
    case 'door.swingDeg':
      error = integerIn(edit.swingDeg, 1, 360, 'Swing angle');
      patch.swingDeg = edit.swingDeg;
      break;
    case 'door.swingSide':
      patch.swingSide = edit.swingSide;
      break;
  }
  if (error) return fail(error);
  const next: Scene = {
    ...scene,
    rooms: scene.rooms.map((room) =>
      room.id !== located.id
        ? room
        : { ...room, doors: room.doors.map((d) => (d.id === edit.doorId ? { ...d, ...patch } : d)) },
    ),
  };
  const parsed = sceneSchema.safeParse(next);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'The edit produced an invalid scene.');
  return ok(next);
}

export function createScenario(input: {
  id: string;
  label: string;
  name: string;
  source: CommittedRevision;
  now: string;
}): Scenario {
  return {
    id: input.id,
    label: input.label,
    name: input.name,
    sourceRevisionId: input.source.id,
    scene: input.source.scene,
    past: [],
    future: [],
    status: 'draft',
    remarks: '',
    createdAt: input.now,
    updatedAt: input.now,
    decision: null,
  };
}

function requireDraft(scenario: Scenario): string | null {
  return scenario.status === 'draft' ? null : `Scenario ${scenario.label} is ${scenario.status.replace(/_/g, ' ')} and cannot be edited.`;
}

export function editScenario(scenario: Scenario, edit: Edit, now: string): Result<Scenario> {
  const locked = requireDraft(scenario);
  if (locked) return fail(locked);
  const result = applyEdit(scenario.scene, edit);
  if (!result.ok) return result;
  if (result.value === scenario.scene) return ok(scenario);
  return ok({
    ...scenario,
    scene: result.value,
    past: [...scenario.past, scenario.scene].slice(-UNDO_LIMIT),
    future: [],
    updatedAt: now,
  });
}

export function undo(scenario: Scenario, now: string): Result<Scenario> {
  const locked = requireDraft(scenario);
  if (locked) return fail(locked);
  const previous = scenario.past[scenario.past.length - 1];
  if (!previous) return fail('Nothing to undo.');
  return ok({ ...scenario, scene: previous, past: scenario.past.slice(0, -1), future: [scenario.scene, ...scenario.future], updatedAt: now });
}

export function redo(scenario: Scenario, now: string): Result<Scenario> {
  const locked = requireDraft(scenario);
  if (locked) return fail(locked);
  const [next, ...rest] = scenario.future;
  if (!next) return fail('Nothing to redo.');
  return ok({ ...scenario, scene: next, past: [...scenario.past, scenario.scene].slice(-UNDO_LIMIT), future: rest, updatedAt: now });
}

/** Restores the source revision's scene. Undoable. */
export function discardChanges(scenario: Scenario, source: CommittedRevision, now: string): Result<Scenario> {
  const locked = requireDraft(scenario);
  if (locked) return fail(locked);
  if (scenario.scene === source.scene) return ok(scenario);
  return ok({ ...scenario, scene: source.scene, past: [...scenario.past, scenario.scene].slice(-UNDO_LIMIT), future: [], updatedAt: now });
}

export function setRemarks(scenario: Scenario, remarks: string, now: string): Scenario {
  return { ...scenario, remarks: remarks.slice(0, 2000), updatedAt: now };
}

export function headRevision(state: ProjectState): CommittedRevision {
  const head = state.revisions[state.revisions.length - 1];
  if (!head) throw new Error('Project has no committed revision.');
  return head;
}

export function revisionById(state: ProjectState, id: string): CommittedRevision | undefined {
  return state.revisions.find((r) => r.id === id);
}

export interface ScenarioEvaluation {
  readonly scenario: Scenario;
  readonly source: CommittedRevision;
  readonly analysis: SceneAnalysis;
  readonly diff: SceneDiff;
  readonly impacts: readonly ImpactRecord[];
  readonly hasChanges: boolean;
}

export function evaluateScenario(state: ProjectState, scenario: Scenario): ScenarioEvaluation {
  const source = revisionById(state, scenario.sourceRevisionId);
  if (!source) throw new Error(`Scenario ${scenario.id} references missing revision ${scenario.sourceRevisionId}.`);
  const analysis = analyzeScene(scenario.scene);
  const diff = diffScenes(source.scene, scenario.scene);
  return { scenario, source, analysis, diff, impacts: computeImpacts(source.scene, scenario.scene, diff), hasChanges: !isEmptyDiff(diff) };
}

export const BLOCKING_FOR_ACCEPTANCE: readonly PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED'];
export const NOTE_REQUIRED_FOR: readonly PairStatus[] = ['CONTACT_REVIEW', 'NEAR_CLEARANCE'];

export function submissionBlockers(evaluation: ScenarioEvaluation): string[] {
  const reasons: string[] = [];
  if (evaluation.scenario.status !== 'draft') reasons.push('Only draft scenarios can be submitted for review.');
  if (!evaluation.hasChanges) reasons.push('There are no changes to review.');
  if (evaluation.analysis.status === 'INVALID') reasons.push('Resolve the invalid configuration before submitting.');
  return reasons;
}

export interface DecisionInput {
  readonly reviewer: string;
  readonly note: string;
  readonly acknowledgedDocuments: boolean;
}

export function acceptanceBlockers(evaluation: ScenarioEvaluation, input: DecisionInput): string[] {
  const reasons: string[] = [];
  const status = evaluation.analysis.status;
  if (evaluation.scenario.status !== 'ready_for_review') reasons.push('Submit the scenario for review first.');
  if (BLOCKING_FOR_ACCEPTANCE.includes(status)) {
    reasons.push(
      status === 'CONFLICT'
        ? 'A verified conflict remains. Resolve it or reject this scenario.'
        : status === 'UNSUPPORTED'
          ? 'Part of this scenario is outside the supported model, so it cannot be verified.'
          : 'The scenario contains an invalid configuration.',
    );
  }
  if (NOTE_REQUIRED_FOR.includes(status) && input.note.trim().length < 3) {
    reasons.push('Add a reviewer note acknowledging the contact or near-clearance advisory.');
  }
  if (evaluation.impacts.length > 0 && !input.acknowledgedDocuments) {
    reasons.push('Confirm that the linked documents still need to be revised by your team.');
  }
  return reasons;
}

function updateScenario(state: ProjectState, scenario: Scenario): ProjectState {
  return { ...state, scenarios: state.scenarios.map((s) => (s.id === scenario.id ? scenario : s)) };
}

export function submitForReview(state: ProjectState, scenarioId: string, now: string): Result<ProjectState> {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return fail(`Scenario ${scenarioId} does not exist.`);
  const blockers = submissionBlockers(evaluateScenario(state, scenario));
  if (blockers.length) return fail(blockers.join(' '));
  return ok(updateScenario(state, { ...scenario, status: 'ready_for_review', updatedAt: now }));
}

export function returnToDraft(state: ProjectState, scenarioId: string, now: string): Result<ProjectState> {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return fail(`Scenario ${scenarioId} does not exist.`);
  if (scenario.status !== 'ready_for_review') return fail('Only scenarios in review can return to draft.');
  return ok(updateScenario(state, { ...scenario, status: 'draft', updatedAt: now }));
}

export function acceptScenario(state: ProjectState, scenarioId: string, input: DecisionInput, now: string): Result<ProjectState> {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return fail(`Scenario ${scenarioId} does not exist.`);
  const evaluation = evaluateScenario(state, scenario);
  const blockers = acceptanceBlockers(evaluation, input);
  if (blockers.length) return fail(blockers.join(' '));
  const revisionId = `REV-${state.revisions.length}`;
  const receipt = buildReceipt({ evaluation, outcome: 'accepted', input, decidedAt: now, resultRevisionId: revisionId });
  const decision: Decision = { outcome: 'accepted', reviewer: input.reviewer.trim(), note: input.note.trim(), decidedAt: now, receiptId: receipt.id };
  const committed: CommittedRevision = {
    id: revisionId,
    label: `Revision ${state.revisions.length}`,
    scene: scenario.scene,
    fingerprint: fingerprint(scenario.scene),
    committedAt: now,
    fromScenarioId: scenario.id,
    receiptId: receipt.id,
    summary: `${scenario.name} accepted`,
  };
  const scenarios = state.scenarios.map((s): Scenario => {
    if (s.id === scenario.id) return { ...s, status: 'accepted', decision, updatedAt: now };
    if (s.sourceRevisionId === scenario.sourceRevisionId && (s.status === 'draft' || s.status === 'ready_for_review')) {
      return { ...s, status: 'superseded', updatedAt: now };
    }
    return s;
  });
  return ok({ revisions: [...state.revisions, committed], scenarios, receipts: [...state.receipts, receipt] });
}

export function rejectScenario(state: ProjectState, scenarioId: string, input: Omit<DecisionInput, 'acknowledgedDocuments'>, now: string): Result<ProjectState> {
  const scenario = state.scenarios.find((s) => s.id === scenarioId);
  if (!scenario) return fail(`Scenario ${scenarioId} does not exist.`);
  if (scenario.status !== 'ready_for_review') return fail('Submit the scenario for review before rejecting it.');
  if (input.note.trim().length < 3) return fail('Add a note explaining the rejection.');
  const evaluation = evaluateScenario(state, scenario);
  const receipt = buildReceipt({
    evaluation,
    outcome: 'rejected',
    input: { ...input, acknowledgedDocuments: false },
    decidedAt: now,
    resultRevisionId: null,
  });
  const decision: Decision = { outcome: 'rejected', reviewer: input.reviewer.trim(), note: input.note.trim(), decidedAt: now, receiptId: receipt.id };
  return ok({
    ...updateScenario(state, { ...scenario, status: 'rejected', decision, updatedAt: now }),
    receipts: [...state.receipts, receipt],
  });
}

export function initialProjectState(baseline: Scene, now: string): ProjectState {
  return {
    revisions: [
      {
        id: 'REV-0',
        label: 'Baseline',
        scene: baseline,
        fingerprint: fingerprint(baseline),
        committedAt: now,
        fromScenarioId: null,
        receiptId: null,
        summary: 'Approved baseline as issued',
      },
    ],
    scenarios: [],
    receipts: [],
  };
}
