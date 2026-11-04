/**
 * Hinge position map: the status of a door at every integer hinge offset along its wall.
 * Hinge offsets are integers, so evaluating every millimetre is exact for the domain.
 * It reuses the same validity and classification functions as analyzeScene.
 */

import { makeDoorFrame, rectToLocal, wallSegment } from '../geometry/frame';
import { classifySeparation } from '../geometry/separation';
import { findWall } from '../model/lookup';
import type { AnalysisSettings, Door, Room } from '../model/types';
import { analyzeDoorValidity, analyzeFurnitureValidity, worstStatus, type PairStatus } from './analyze';

export interface HingeMapSegment {
  readonly fromMm: number;
  readonly toMm: number;
  readonly status: PairStatus;
  /** Furniture whose result produced the segment status (empty for PASS / INVALID). */
  readonly limitingIds: readonly string[];
}

export interface HingeMap {
  readonly roomId: string;
  readonly doorId: string;
  readonly wallLengthMm: number;
  readonly segments: readonly HingeMapSegment[];
}

/** Door status at a given hinge offset with the rest of the room unchanged. */
export function doorStatusAtOffset(
  room: Room,
  door: Door,
  offsetMm: number,
  settings: AnalysisSettings,
  furnitureValidity: ReadonlyMap<string, ReturnType<typeof analyzeFurnitureValidity>['validity']>,
): { status: PairStatus; limitingIds: string[] } {
  const moved: Door = { ...door, hingeOffsetMm: offsetMm };
  const movedRoom: Room = { ...room, doors: room.doors.map((d) => (d.id === door.id ? moved : d)) };
  const { validity } = analyzeDoorValidity(movedRoom, moved);
  if (validity !== 'VALID') return { status: validity, limitingIds: [] };
  const wall = findWall(room, door.wallId)!;
  const frame = makeDoorFrame(wall.side, room.widthMm, room.depthMm, offsetMm, door.leafDirection);
  const results: { id: string; status: PairStatus }[] = room.furniture.map((item) => {
    const itemValidity = furnitureValidity.get(item.id) ?? 'INVALID';
    if (itemValidity !== 'VALID' || item.footprint.kind !== 'rect') return { id: item.id, status: itemValidity === 'VALID' ? 'UNSUPPORTED' : itemValidity };
    return { id: item.id, status: classifySeparation(moved.leafWidthMm, rectToLocal(frame, item.footprint), settings) };
  });
  const status = worstStatus(results.map((r) => r.status));
  return { status, limitingIds: status === 'PASS' ? [] : results.filter((r) => r.status === status).map((r) => r.id) };
}

export function computeHingeMap(room: Room, door: Door, settings: AnalysisSettings): HingeMap {
  const wall = findWall(room, door.wallId);
  if (!wall) return { roomId: room.id, doorId: door.id, wallLengthMm: 0, segments: [] };
  const length = wallSegment(wall.side, room.widthMm, room.depthMm).length;
  const furnitureValidity = new Map(room.furniture.map((item) => [item.id, analyzeFurnitureValidity(room, item).validity]));
  const segments: HingeMapSegment[] = [];
  let current: { fromMm: number; status: PairStatus; limitingIds: string[] } | null = null;
  for (let offset = 0; offset <= length; offset += 1) {
    const { status, limitingIds } = doorStatusAtOffset(room, door, offset, settings, furnitureValidity);
    const sameIds = current && current.limitingIds.join(',') === limitingIds.join(',');
    if (current && current.status === status && sameIds) continue;
    if (current) segments.push({ fromMm: current.fromMm, toMm: offset - 1, status: current.status, limitingIds: current.limitingIds });
    current = { fromMm: offset, status, limitingIds };
  }
  if (current) segments.push({ fromMm: current.fromMm, toMm: length, status: current.status, limitingIds: current.limitingIds });
  return { roomId: room.id, doorId: door.id, wallLengthMm: length, segments };
}

export function segmentAt(map: HingeMap, offsetMm: number): HingeMapSegment | undefined {
  return map.segments.find((s) => offsetMm >= s.fromMm && offsetMm <= s.toMm);
}
