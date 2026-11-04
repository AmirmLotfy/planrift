/**
 * PLANRIFT project files (`.planrift.json`) — the single serialisation path for export,
 * import and browser persistence. Imports are untrusted: size-limited, parsed as plain
 * JSON data, validated with strict schemas (unknown keys rejected), cross-checked for
 * referential integrity, and fingerprint-verified. Nothing in a file is executed or fetched.
 */

import { z } from 'zod';
import { sceneSchema, idSchema, LIMITS } from '../model/schema';
import type { Scene } from '../model/types';
import type { ProjectState, Scenario } from '../revision/scenario';
import { initialProjectState } from '../revision/scenario';
import { fingerprint } from './canonical';

export const MAX_IMPORT_BYTES = 2_000_000;

const isoDateTime = z.iso.datetime({ offset: true });
const text = (max: number) => z.string().max(max);
const statusSchema = z.enum(['PASS', 'NEAR_CLEARANCE', 'CONTACT_REVIEW', 'CONFLICT', 'INVALID', 'UNSUPPORTED']);
const changeValue = z.union([z.string().max(LIMITS.longText), z.number(), z.boolean(), z.null()]).optional();

const decisionSchema = z.strictObject({
  outcome: z.enum(['accepted', 'rejected']),
  reviewer: text(LIMITS.shortText),
  note: text(LIMITS.longText),
  decidedAt: isoDateTime,
  receiptId: text(64),
});

const revisionSchema = z.strictObject({
  id: idSchema,
  label: text(LIMITS.shortText),
  scene: sceneSchema,
  fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  committedAt: isoDateTime,
  fromScenarioId: idSchema.nullable(),
  receiptId: text(64).nullable(),
  summary: text(LIMITS.mediumText),
});

const scenarioSchema = z.strictObject({
  id: idSchema,
  label: z.string().regex(/^[A-Z]{1,2}$/),
  name: text(LIMITS.shortText),
  sourceRevisionId: idSchema,
  scene: sceneSchema,
  status: z.enum(['draft', 'ready_for_review', 'accepted', 'rejected', 'superseded']),
  remarks: text(LIMITS.longText),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  decision: decisionSchema.nullable(),
});

const impactSchema = z.strictObject({
  documentId: idSchema,
  title: text(LIMITS.mediumText),
  kind: z.enum(['drawing', 'schedule', 'specification']),
  revision: text(8),
  status: z.literal('REVIEW_REQUIRED'),
  elementIds: z.array(idSchema).max(200),
  reasons: z
    .array(
      z.strictObject({
        linkId: idSchema,
        elementId: idSchema,
        roomId: idSchema,
        description: text(LIMITS.mediumText * 2),
        linkNote: text(LIMITS.mediumText),
      }),
    )
    .max(500),
});

export const receiptSchema = z.strictObject({
  format: z.literal('planrift.receipt'),
  version: z.literal(1),
  id: text(64),
  project: z.strictObject({ id: idSchema, name: text(LIMITS.mediumText) }),
  scenario: z.strictObject({ id: idSchema, label: text(4), name: text(LIMITS.shortText), remarks: text(LIMITS.longText) }),
  source: z.strictObject({ revisionId: idSchema, fingerprint: z.string().regex(/^[0-9a-f]{64}$/) }),
  result: z.strictObject({ revisionId: idSchema.nullable(), fingerprint: z.string().regex(/^[0-9a-f]{64}$/) }),
  changes: z
    .array(z.strictObject({ elementId: idSchema, field: text(80), before: changeValue, after: changeValue, description: text(LIMITS.mediumText * 2) }))
    .max(500),
  analysis: z.strictObject({
    engineVersion: text(64),
    status: statusSchema,
    settings: z.strictObject({ contactToleranceMm: z.int(), nearClearanceMm: z.int() }),
    doors: z.array(z.strictObject({ doorId: idSchema, status: statusSchema, maxOpeningDeg: z.number().nullable() })).max(200),
    pairs: z
      .array(
        z.strictObject({
          roomId: idSchema,
          doorId: idSchema,
          furnitureId: idSchema,
          status: statusSchema,
          separationMm: z.number().nullable(),
          firstStrikeDeg: z.number().nullable(),
        }),
      )
      .max(2000),
  }),
  impacts: z.array(impactSchema).max(200),
  decision: z.strictObject({
    outcome: z.enum(['accepted', 'rejected']),
    reviewer: text(LIMITS.shortText),
    note: text(LIMITS.longText),
    decidedAt: isoDateTime,
    acknowledgedDocuments: z.boolean(),
  }),
  limitations: z.array(text(400)).max(20),
});

export const projectFileSchema = z.strictObject({
  format: z.literal('planrift.project'),
  version: z.literal(1),
  exportedAt: isoDateTime,
  revisions: z.array(revisionSchema).min(1).max(50),
  scenarios: z.array(scenarioSchema).max(26),
  receipts: z.array(receiptSchema).max(100),
});

export type ProjectFile = z.infer<typeof projectFileSchema>;

export function toProjectFile(state: ProjectState, exportedAt: string): ProjectFile {
  return {
    format: 'planrift.project',
    version: 1,
    exportedAt,
    revisions: state.revisions.map((r) => ({ ...r })),
    scenarios: state.scenarios.map((s) => ({
      id: s.id,
      label: s.label,
      name: s.name,
      sourceRevisionId: s.sourceRevisionId,
      scene: s.scene,
      status: s.status,
      remarks: s.remarks,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      decision: s.decision,
    })),
    receipts: state.receipts.map((r) => structuredClone(r)) as ProjectFile['receipts'],
  };
}

export function serializeProject(state: ProjectState, exportedAt: string): string {
  return JSON.stringify(toProjectFile(state, exportedAt), null, 2);
}

export type ImportResult =
  | { ok: true; state: ProjectState; kind: 'project' | 'scene'; warnings: string[] }
  | { ok: false; errors: string[] };

function formatIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => {
    const where = issue.path.length ? issue.path.join('.') : 'file';
    return `${where}: ${issue.message}`;
  });
}

function integrityErrors(file: ProjectFile): string[] {
  const errors: string[] = [];
  const revisionIds = new Set<string>();
  for (const revision of file.revisions) {
    if (revisionIds.has(revision.id)) errors.push(`Duplicate revision ID ${revision.id}.`);
    revisionIds.add(revision.id);
    if (fingerprint(revision.scene) !== revision.fingerprint) {
      errors.push(`Revision ${revision.id} does not match its recorded fingerprint; the file may have been altered.`);
    }
  }
  const scenarioIds = new Set<string>();
  for (const scenario of file.scenarios) {
    if (scenarioIds.has(scenario.id)) errors.push(`Duplicate scenario ID ${scenario.id}.`);
    scenarioIds.add(scenario.id);
    if (!revisionIds.has(scenario.sourceRevisionId)) errors.push(`Scenario ${scenario.id} references missing revision ${scenario.sourceRevisionId}.`);
  }
  const receiptIds = new Set<string>();
  for (const receipt of file.receipts) {
    if (receiptIds.has(receipt.id)) errors.push(`Duplicate receipt ID ${receipt.id}.`);
    receiptIds.add(receipt.id);
  }
  return errors;
}

/** Parses untrusted text into a project state. Never throws. */
export function importProjectText(input: string, now: string): ImportResult {
  if (typeof input !== 'string') return { ok: false, errors: ['File content is not text.'] };
  if (input.length > MAX_IMPORT_BYTES) return { ok: false, errors: [`File is larger than ${MAX_IMPORT_BYTES / 1_000_000} MB.`] };
  let data: unknown;
  try {
    data = JSON.parse(input);
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] };
  }
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['File must contain a PLANRIFT project or scene object.'] };
  }
  const format = (data as { format?: unknown }).format;
  if (format === 'planrift.scene') {
    const parsed = sceneSchema.safeParse(data);
    if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
    return { ok: true, state: initialProjectState(parsed.data as Scene, now), kind: 'scene', warnings: ['Imported as a new baseline. Scenarios start empty.'] };
  }
  if (format !== 'planrift.project') {
    return { ok: false, errors: ['Unrecognised file. Expected "format": "planrift.project" or "planrift.scene".'] };
  }
  const parsed = projectFileSchema.safeParse(data);
  if (!parsed.success) return { ok: false, errors: formatIssues(parsed.error) };
  const errors = integrityErrors(parsed.data);
  if (errors.length) return { ok: false, errors };
  const file = parsed.data;
  const scenarios: Scenario[] = file.scenarios.map((s) => ({ ...s, scene: s.scene as Scene, past: [], future: [] }));
  return {
    ok: true,
    kind: 'project',
    warnings: [],
    state: {
      revisions: file.revisions.map((r) => ({ ...r, scene: r.scene as Scene })),
      scenarios,
      receipts: file.receipts as unknown as ProjectState['receipts'],
    },
  };
}
