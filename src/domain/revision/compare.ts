/**
 * Side-by-side comparison of a committed revision and proposal scenarios for one door.
 * Every value is read from the scene analysis; nothing is restated or re-derived here.
 */

import { analyzeScene, doorAnalysis, pairsForDoor, type PairStatus, type SceneAnalysis } from '../analysis/analyze';
import { findDoor } from '../model/lookup';
import type { Scene } from '../model/types';
import { changedElementIds, diffScenes } from './diff';
import { computeImpacts, type ImpactRecord } from './impact';
import { revisionById, type Decision, type ProjectState, type ScenarioStatus } from './scenario';

export interface ComparisonPair {
  readonly furnitureId: string;
  readonly status: PairStatus;
  readonly separationMm: number | null;
}

export interface ComparisonColumn {
  readonly id: string;
  readonly label: string;
  readonly name: string;
  readonly kind: 'revision' | 'scenario';
  readonly lifecycle: ScenarioStatus | 'committed';
  readonly scene: Scene;
  readonly analysis: SceneAnalysis;
  readonly hingeOffsetMm: number | null;
  readonly hingeDeltaMm: number | null;
  readonly doorStatus: PairStatus;
  readonly maxOpeningDeg: number | null;
  readonly limitingFurnitureId: string | null;
  /** The governing (smallest) signed separation for the focus door. */
  readonly governing: ComparisonPair | null;
  readonly attentionPairs: readonly ComparisonPair[];
  readonly changedElementIds: readonly string[];
  readonly impacts: readonly ImpactRecord[];
  readonly remarks: string;
  readonly decision: Decision | null;
}

function column(
  base: Pick<ComparisonColumn, 'id' | 'label' | 'name' | 'kind' | 'lifecycle' | 'remarks' | 'decision'>,
  scene: Scene,
  source: Scene,
  focusDoorId: string,
): ComparisonColumn {
  const analysis = analyzeScene(scene);
  const door = doorAnalysis(analysis, focusDoorId);
  const located = findDoor(scene, focusDoorId);
  const sourceDoor = findDoor(source, focusDoorId);
  const pairs = pairsForDoor(analysis, focusDoorId).map((p) => ({
    furnitureId: p.furnitureId,
    status: p.status,
    separationMm: p.separation ? p.separation.valueMm : null,
  }));
  const evaluated = pairs.filter((p) => p.separationMm !== null);
  const governing = evaluated.length
    ? evaluated.reduce((min, p) => ((p.separationMm as number) < (min.separationMm as number) ? p : min))
    : (pairs[0] ?? null);
  const diff = diffScenes(source, scene);
  return {
    ...base,
    scene,
    analysis,
    hingeOffsetMm: located ? located.door.hingeOffsetMm : null,
    hingeDeltaMm: located && sourceDoor ? located.door.hingeOffsetMm - sourceDoor.door.hingeOffsetMm : null,
    doorStatus: door?.status ?? 'INVALID',
    maxOpeningDeg: door?.maxOpeningDeg ?? null,
    limitingFurnitureId: door?.limitingFurnitureId ?? null,
    governing,
    attentionPairs: pairs.filter((p) => p.status !== 'PASS'),
    changedElementIds: changedElementIds(diff),
    impacts: computeImpacts(source, scene, diff),
  };
}

/** Columns: the scenarios' shared source revision, then each requested scenario. */
export function buildComparison(state: ProjectState, scenarioIds: readonly string[], focusDoorId: string): ComparisonColumn[] {
  const scenarios = scenarioIds
    .map((id) => state.scenarios.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const sourceId = scenarios[0]?.sourceRevisionId ?? state.revisions[0]?.id;
  const source = sourceId ? revisionById(state, sourceId) : undefined;
  if (!source) return [];
  const columns: ComparisonColumn[] = [
    column(
      { id: source.id, label: source.id === 'REV-0' ? 'Baseline' : source.label, name: source.summary, kind: 'revision', lifecycle: 'committed', remarks: '', decision: null },
      source.scene,
      source.scene,
      focusDoorId,
    ),
  ];
  for (const scenario of scenarios) {
    const scenarioSource = revisionById(state, scenario.sourceRevisionId) ?? source;
    columns.push(
      column(
        { id: scenario.id, label: `Revision ${scenario.label}`, name: scenario.name, kind: 'scenario', lifecycle: scenario.status, remarks: scenario.remarks, decision: scenario.decision },
        scenario.scene,
        scenarioSource.scene,
        focusDoorId,
      ),
    );
  }
  return columns;
}
