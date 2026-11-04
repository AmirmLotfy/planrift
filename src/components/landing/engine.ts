/**
 * Landing-page access to the real engine. Pure and memoised: each hinge position is solved by
 * analyzeScene exactly as in the studio; nothing on the landing page is pre-rendered or typed in.
 */

import { analyzeScene, doorAnalysis, pairsForDoor, type SceneAnalysis } from '@/domain/analysis/analyze';
import { computeHingeMap, type HingeMap } from '@/domain/analysis/hingeMap';
import { formatDeg, formatMeasure } from '@/domain/format';
import type { Scene } from '@/domain/model/types';
import { diffScenes } from '@/domain/revision/diff';
import { computeImpacts, type ImpactRecord } from '@/domain/revision/impact';
import { createAsterHouseScene } from '@/domain/seed/asterHouse';

export const BASELINE: Scene = createAsterHouseScene();

export interface Frame {
  readonly hingeMm: number;
  readonly scene: Scene;
  readonly analysis: SceneAnalysis;
  readonly impacts: readonly ImpactRecord[];
}

const cache = new Map<number, Frame>();

export function solveAt(hingeMm: number): Frame {
  const mm = Math.round(hingeMm);
  let frame = cache.get(mm);
  if (!frame) {
    const scene = structuredClone(BASELINE);
    scene.rooms[0]!.doors[0]!.hingeOffsetMm = mm;
    frame = { hingeMm: mm, scene, analysis: analyzeScene(scene), impacts: computeImpacts(BASELINE, scene, diffScenes(BASELINE, scene)) };
    if (cache.size > 800) cache.delete(cache.keys().next().value as number);
    cache.set(mm, frame);
  }
  return frame;
}

let map: HingeMap | null = null;

/** Status of D-101 at every whole-millimetre hinge position (same functions as analyzeScene). */
export function hingeMap(): HingeMap {
  if (!map) {
    const room = BASELINE.rooms[0]!;
    map = computeHingeMap(room, room.doors[0]!, BASELINE.settings);
  }
  return map;
}

/** One plain sentence describing the computed result for D-101 in a frame. */
export function headlineFor(frame: Frame): string {
  const door = doorAnalysis(frame.analysis, 'D-101')!;
  if (door.validity === 'INVALID') return door.issues[0]?.message ?? 'Invalid position.';
  if (door.validity === 'UNSUPPORTED') return 'Outside the supported door model.';
  if (door.maxOpeningDeg !== null && door.maxOpeningDeg < 90 && door.limitingFurnitureId) {
    return `Strikes console ${door.limitingFurnitureId} after ${formatDeg(door.maxOpeningDeg)} of opening.`;
  }
  const near = pairsForDoor(frame.analysis, 'D-101').find((p) => p.status !== 'PASS');
  if (near?.separation) return `Clears ${near.furnitureId} by only ${formatMeasure(near.separation.valueMm)}.`;
  return 'Opens the full 90° without touching furniture.';
}
