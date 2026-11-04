import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { csvCell, impactLedgerCsv } from '@/domain/io/csv';
import { fingerprint } from '@/domain/io/canonical';
import { importProjectText, MAX_IMPORT_BYTES, serializeProject } from '@/domain/io/projectFile';
import { sceneSchema } from '@/domain/model/schema';
import { buildComparison } from '@/domain/revision/compare';
import { diffScenes, isEmptyDiff } from '@/domain/revision/diff';
import { computeImpacts } from '@/domain/revision/impact';
import {
  acceptanceBlockers,
  acceptScenario,
  createScenario,
  discardChanges,
  editScenario,
  evaluateScenario,
  headRevision,
  initialProjectState,
  redo,
  rejectScenario,
  returnToDraft,
  submitForReview,
  undo,
  type Edit,
  type ProjectState,
  type Scenario,
} from '@/domain/revision/scenario';
import { createAsterHouseScene } from '@/domain/seed/asterHouse';

const NOW = '2026-11-04T10:00:00.000Z';

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: string }): T {
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

function demoState(): ProjectState {
  const base = initialProjectState(createAsterHouseScene(), NOW);
  const head = headRevision(base);
  let a = createScenario({ id: 'S-A', label: 'A', name: 'Door at 3000 mm', source: head, now: NOW });
  a = unwrap(editScenario(a, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 3000 }, NOW));
  let b = createScenario({ id: 'S-B', label: 'B', name: 'Door at 2400 mm', source: head, now: NOW });
  b = unwrap(editScenario(b, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2400 }, NOW));
  return { ...base, scenarios: [a, b] };
}

const scenario = (state: ProjectState, id: string): Scenario => state.scenarios.find((s) => s.id === id)!;

describe('diff', () => {
  it('an unchanged scene produces no delta, including after serialisation', () => {
    const scene = createAsterHouseScene();
    expect(isEmptyDiff(diffScenes(scene, scene))).toBe(true);
    expect(isEmptyDiff(diffScenes(scene, JSON.parse(JSON.stringify(scene))))).toBe(true);
    expect(isEmptyDiff(diffScenes(scene, createAsterHouseScene()))).toBe(true);
  });

  it('moving D-101 is exactly one field change', () => {
    const state = demoState();
    const evaluation = evaluateScenario(state, scenario(state, 'S-A'));
    expect(evaluation.diff.fields).toEqual([
      { roomId: 'R-512', elementId: 'D-101', elementKind: 'door', field: 'hingeOffsetMm', before: 1700, after: 3000 },
    ]);
  });
});

describe('document impact ledger', () => {
  it('flags A-101, A-401 and D-01 for D-101 and nothing in R-513', () => {
    const state = demoState();
    const { impacts } = evaluateScenario(state, scenario(state, 'S-A'));
    expect(impacts.map((i) => i.documentId)).toEqual(['A-101', 'A-401', 'D-01']);
    expect(impacts.every((i) => i.status === 'REVIEW_REQUIRED')).toBe(true);
    expect(impacts.flatMap((i) => i.elementIds)).toEqual(['D-101', 'D-101', 'D-101']);
    expect(impacts.flatMap((i) => i.reasons.map((r) => r.roomId))).toEqual(['R-512', 'R-512', 'R-512']);
    expect(impacts[0]!.reasons[0]!.description).toBe('D-101 hinge position 1,700 mm → 3,000 mm (+1,300 mm)');
  });

  it('review stays required when the alternative clears geometrically', () => {
    const state = demoState();
    const evaluation = evaluateScenario(state, scenario(state, 'S-B'));
    expect(evaluation.analysis.status).toBe('PASS');
    expect(evaluation.impacts.map((i) => i.documentId)).toEqual(['A-101', 'A-401', 'D-01']);
  });

  it('moving the door back to its baseline position clears the ledger', () => {
    const state = demoState();
    const back = unwrap(editScenario(scenario(state, 'S-A'), { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 1700 }, NOW));
    expect(evaluateScenario(state, back).impacts).toEqual([]);
  });

  it('a field-scoped link only triggers on its fields', () => {
    const scene = createAsterHouseScene();
    const proposal = structuredClone(scene);
    proposal.rooms[0]!.doors[0]!.swingSide = 'exterior';
    const impacts = computeImpacts(scene, proposal, diffScenes(scene, proposal));
    // A-401 (elevation) is mapped to position/size fields only; swing side does not trigger it.
    expect(impacts.map((i) => i.documentId)).toEqual(['A-101', 'D-01']);
  });
});

describe('edits, undo and redo', () => {
  it('rejects non-integer, non-finite and out-of-range edits without changing the scene', () => {
    const head = headRevision(initialProjectState(createAsterHouseScene(), NOW));
    const s = createScenario({ id: 'S-A', label: 'A', name: 'A', source: head, now: NOW });
    for (const bad of [3000.5, Number.NaN, Infinity, 1e9]) {
      const result = editScenario(s, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: bad }, NOW);
      expect(result.ok).toBe(false);
    }
    expect(editScenario(s, { kind: 'door.hinge', doorId: 'D-999', hingeOffsetMm: 10 }, NOW).ok).toBe(false);
  });

  it('undo, redo and discard restore exact snapshots', () => {
    const head = headRevision(initialProjectState(createAsterHouseScene(), NOW));
    let s = createScenario({ id: 'S-A', label: 'A', name: 'A', source: head, now: NOW });
    s = unwrap(editScenario(s, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 3000 }, NOW));
    s = unwrap(editScenario(s, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2400 }, NOW));
    s = unwrap(undo(s, NOW));
    expect(s.scene.rooms[0]!.doors[0]!.hingeOffsetMm).toBe(3000);
    s = unwrap(redo(s, NOW));
    expect(s.scene.rooms[0]!.doors[0]!.hingeOffsetMm).toBe(2400);
    s = unwrap(discardChanges(s, head, NOW));
    expect(fingerprint(s.scene)).toBe(head.fingerprint);
    s = unwrap(undo(s, NOW));
    expect(s.scene.rooms[0]!.doors[0]!.hingeOffsetMm).toBe(2400);
  });

  it('random edit / undo / redo sequences keep every snapshot schema-valid and reversible', () => {
    const edit = fc.oneof(
      fc.integer({ min: -2000, max: 9000 }).map((v): Edit => ({ kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: v })),
      fc.integer({ min: 300, max: 1400 }).map((v): Edit => ({ kind: 'door.leafWidth', doorId: 'D-101', leafWidthMm: v })),
      fc.constantFrom<Edit>({ kind: 'door.leafDirection', doorId: 'D-101', leafDirection: 'toward-start' }, { kind: 'door.leafDirection', doorId: 'D-101', leafDirection: 'toward-end' }),
    );
    const step = fc.oneof(edit.map((e) => ({ op: 'edit' as const, e })), fc.constant({ op: 'undo' as const }), fc.constant({ op: 'redo' as const }));
    fc.assert(
      fc.property(fc.array(step, { maxLength: 40 }), (steps) => {
        const head = headRevision(initialProjectState(createAsterHouseScene(), NOW));
        let s = createScenario({ id: 'S-A', label: 'A', name: 'A', source: head, now: NOW });
        for (const st of steps) {
          const r = st.op === 'edit' ? editScenario(s, st.e, NOW) : st.op === 'undo' ? undo(s, NOW) : redo(s, NOW);
          if (r.ok) s = r.value;
          expect(sceneSchema.safeParse(s.scene).success).toBe(true);
        }
        while (s.past.length) s = unwrap(undo(s, NOW));
        expect(fingerprint(s.scene)).toBe(head.fingerprint);
      }),
      { numRuns: 150 },
    );
  });
});

describe('review lifecycle', () => {
  it('cannot submit a scenario without changes or with an invalid configuration', () => {
    const base = initialProjectState(createAsterHouseScene(), NOW);
    const empty = createScenario({ id: 'S-A', label: 'A', name: 'A', source: headRevision(base), now: NOW });
    expect(submitForReview({ ...base, scenarios: [empty] }, 'S-A', NOW).ok).toBe(false);
    const invalid = unwrap(editScenario(empty, { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 5400 }, NOW));
    const result = submitForReview({ ...base, scenarios: [invalid] }, 'S-A', NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('invalid');
  });

  it('a conflicting scenario cannot be accepted, but can be rejected with a note', () => {
    let state = unwrap(submitForReview(demoState(), 'S-A', NOW));
    const evaluation = evaluateScenario(state, scenario(state, 'S-A'));
    expect(acceptanceBlockers(evaluation, { reviewer: 'J. Ortiz', note: 'ok', acknowledgedDocuments: true })[0]).toContain('conflict');
    expect(acceptScenario(state, 'S-A', { reviewer: '', note: '', acknowledgedDocuments: true }, NOW).ok).toBe(false);
    expect(rejectScenario(state, 'S-A', { reviewer: '', note: '' }, NOW).ok).toBe(false);
    state = unwrap(rejectScenario(state, 'S-A', { reviewer: 'J. Ortiz', note: 'Door strikes console F-07.' }, NOW));
    expect(scenario(state, 'S-A').status).toBe('rejected');
    expect(state.receipts[0]!.decision.outcome).toBe('rejected');
    expect(state.revisions).toHaveLength(1);
  });

  it('accepting B commits REV-1 with a receipt and requires document acknowledgement', () => {
    let state = unwrap(submitForReview(demoState(), 'S-B', NOW));
    expect(acceptScenario(state, 'S-B', { reviewer: 'J. Ortiz', note: '', acknowledgedDocuments: false }, NOW).ok).toBe(false);
    state = unwrap(acceptScenario(state, 'S-B', { reviewer: 'J. Ortiz', note: 'Clear swing.', acknowledgedDocuments: true }, NOW));
    expect(headRevision(state).id).toBe('REV-1');
    expect(headRevision(state).scene.rooms[0]!.doors[0]!.hingeOffsetMm).toBe(2400);
    expect(scenario(state, 'S-B').status).toBe('accepted');
    expect(scenario(state, 'S-A').status).toBe('superseded');
    const receipt = state.receipts[0]!;
    expect(receipt.result.revisionId).toBe('REV-1');
    expect(receipt.source.fingerprint).toBe(state.revisions[0]!.fingerprint);
    expect(receipt.result.fingerprint).toBe(headRevision(state).fingerprint);
    expect(receipt.impacts.map((i) => i.documentId)).toEqual(['A-101', 'A-401', 'D-01']);
    expect(receipt.analysis.pairs.find((p) => p.furnitureId === 'F-07')).toMatchObject({ status: 'PASS', separationMm: 391.5 });
    expect(receipt.limitations.join(' ')).toContain('has not modified them');
    expect(editScenario(scenario(state, 'S-B'), { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 10 }, NOW).ok).toBe(false);
  });

  it('a scenario in review is locked until returned to draft', () => {
    let state = unwrap(submitForReview(demoState(), 'S-B', NOW));
    expect(editScenario(scenario(state, 'S-B'), { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2500 }, NOW).ok).toBe(false);
    state = unwrap(returnToDraft(state, 'S-B', NOW));
    expect(editScenario(scenario(state, 'S-B'), { kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2500 }, NOW).ok).toBe(true);
  });
});

describe('comparison', () => {
  it('baseline vs A vs B for D-101', () => {
    const columns = buildComparison(demoState(), ['S-A', 'S-B'], 'D-101');
    expect(columns.map((c) => [c.label, c.hingeOffsetMm, c.hingeDeltaMm, c.doorStatus])).toEqual([
      ['Baseline', 1700, 0, 'PASS'],
      ['Revision A', 3000, 1300, 'CONFLICT'],
      ['Revision B', 2400, 700, 'PASS'],
    ]);
    expect(columns[1]!.governing).toMatchObject({ furnitureId: 'F-07', status: 'CONFLICT' });
    expect(columns[1]!.maxOpeningDeg).toBeCloseTo(15.7, 1);
    expect(columns[2]!.governing!.separationMm).toBeCloseTo(391.49, 2);
    expect(columns[0]!.impacts).toEqual([]);
    expect(columns[2]!.impacts).toHaveLength(3);
  });
});

describe('project files', () => {
  it('export → import preserves geometry, identifiers and decisions', () => {
    let state = unwrap(submitForReview(demoState(), 'S-B', NOW));
    state = unwrap(acceptScenario(state, 'S-B', { reviewer: 'J. Ortiz', note: 'Clear swing.', acknowledgedDocuments: true }, NOW));
    const text = serializeProject(state, NOW);
    const imported = importProjectText(text, NOW);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;
    expect(imported.state.revisions.map((r) => r.fingerprint)).toEqual(state.revisions.map((r) => r.fingerprint));
    expect(imported.state.scenarios.map((s) => [s.id, s.status, fingerprint(s.scene)])).toEqual(
      state.scenarios.map((s) => [s.id, s.status, fingerprint(s.scene)]),
    );
    expect(imported.state.receipts).toEqual(state.receipts);
    expect(serializeProject(imported.state, NOW)).toBe(text);
  });

  it('accepts a bare scene as a new baseline', () => {
    const result = importProjectText(JSON.stringify(createAsterHouseScene()), NOW);
    expect(result.ok && result.kind).toBe('scene');
  });

  const mutate = (fn: (file: Record<string, unknown>) => void): string => {
    const file = JSON.parse(serializeProject(demoState(), NOW)) as Record<string, unknown>;
    fn(file);
    return JSON.stringify(file);
  };

  it.each([
    ['not JSON', '{"format": "planrift.project",'],
    ['a JSON array', '[]'],
    ['an unknown format', '{"format":"other"}'],
    ['an unknown key', mutate((f) => ((f as { extra?: number }).extra = 1))],
    // Assigning __proto__ in JS would set the prototype; the attack only exists as raw JSON text,
    // where JSON.parse creates an own "__proto__" property.
    ['a prototype-pollution key', serializeProject(demoState(), NOW).replace('"id": "REV-0"', '"__proto__": { "polluted": true }, "id": "REV-0"')],
    ['a fractional coordinate', mutate((f) => (((f.revisions as { scene: { rooms: { doors: { hingeOffsetMm: number }[] }[] } }[])[0]!.scene.rooms[0]!.doors[0]!.hingeOffsetMm = 1700.5)))],
    ['a tampered scene', mutate((f) => (((f.revisions as { scene: { rooms: { doors: { hingeOffsetMm: number }[] }[] } }[])[0]!.scene.rooms[0]!.doors[0]!.hingeOffsetMm = 1701)))],
    ['a dangling link', mutate((f) => (((f.revisions as { scene: { links: { elementId: string }[] } }[])[0]!.scene.links[0]!.elementId = 'X-1')))],
    ['a duplicate ID', mutate((f) => (((f.revisions as { scene: { rooms: { furniture: { id: string }[] }[] } }[])[0]!.scene.rooms[0]!.furniture[1]!.id = 'F-01')))],
    ['a script-bearing name longer than allowed', mutate((f) => (((f.revisions as { scene: { project: { name: string } } }[])[0]!.scene.project.name = '<script>'.repeat(40))))],
    ['oversized input', ' '.repeat(MAX_IMPORT_BYTES + 1)],
  ])('rejects %s safely', (_label, text) => {
    const result = importProjectText(text, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.length).toBeGreaterThan(0);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('CSV', () => {
  it('neutralises spreadsheet formulas and quotes separators', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-2 mm')).toBe("'-2 mm");
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell(null)).toBe('');
  });

  it('exports one ledger row per document reason', () => {
    const csv = impactLedgerCsv(buildComparison(demoState(), ['S-A', 'S-B'], 'D-101'));
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(1 + 6);
    expect(lines[1]).toContain('A-101');
    expect(csv).not.toContain('A-402');
  });
});
