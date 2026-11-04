/**
 * Scene analysis: the only place where geometric statuses are produced.
 * Every view (2D plan, 3D cutaway, panels, comparison, exports) reads these results.
 */

import {
  makeDoorFrame,
  rectToLocal,
  roomDepthFromWall,
  wallSegment,
  type DoorFrame,
  type LocalRect,
} from '../geometry/frame';
import {
  classifySeparation,
  signedSeparation,
  type GeometricStatus,
  type Separation,
} from '../geometry/separation';
import { overlapAreaMm2, strikeRange, type StrikeRange } from '../geometry/sweep';
import { findWall, footprintBounds } from '../model/lookup';
import type { AnalysisSettings, Door, Furniture, Room, Scene } from '../model/types';

export const ENGINE_VERSION = 'planrift-geometry/1.0.0';

export type PairStatus = GeometricStatus | 'INVALID' | 'UNSUPPORTED';
export type Validity = 'VALID' | 'INVALID' | 'UNSUPPORTED';

/** Worst-first ordering used for summaries. */
export const STATUS_SEVERITY: readonly PairStatus[] = [
  'INVALID',
  'CONFLICT',
  'UNSUPPORTED',
  'CONTACT_REVIEW',
  'NEAR_CLEARANCE',
  'PASS',
];

export function worstStatus(statuses: Iterable<PairStatus>): PairStatus {
  let worst: PairStatus = 'PASS';
  for (const status of statuses) {
    if (STATUS_SEVERITY.indexOf(status) < STATUS_SEVERITY.indexOf(worst)) worst = status;
  }
  return worst;
}

export type IssueCode =
  | 'door.unsupported-operation'
  | 'door.unsupported-swing-angle'
  | 'door.unsupported-swing-side'
  | 'door.wall-missing'
  | 'door.hinge-outside-wall'
  | 'door.leaf-outside-wall'
  | 'door.sweep-exceeds-room'
  | 'door.openings-overlap'
  | 'furniture.unsupported-shape'
  | 'furniture.unsupported-rotation'
  | 'furniture.degenerate'
  | 'furniture.outside-room';

export interface Issue {
  readonly code: IssueCode;
  readonly severity: 'INVALID' | 'UNSUPPORTED';
  readonly roomId: string;
  readonly elementId: string;
  readonly message: string;
}

export interface DoorAnalysis {
  readonly roomId: string;
  readonly doorId: string;
  readonly validity: Validity;
  readonly issues: readonly Issue[];
  /** Present only for valid, supported doors. */
  readonly frame: DoorFrame | null;
  readonly radiusMm: number;
  /** Largest opening angle reachable before striking furniture; 90 when the swing is clear. */
  readonly maxOpeningDeg: number | null;
  readonly limitingFurnitureId: string | null;
  readonly status: PairStatus;
}

export interface FurnitureAnalysis {
  readonly roomId: string;
  readonly furnitureId: string;
  readonly validity: Validity;
  readonly issues: readonly Issue[];
}

export interface PairAnalysis {
  readonly key: string;
  readonly roomId: string;
  readonly doorId: string;
  readonly furnitureId: string;
  readonly status: PairStatus;
  /** Door-local rectangle that was tested (null when not evaluated). */
  readonly localRect: LocalRect | null;
  readonly separation: Separation | null;
  readonly strike: StrikeRange | null;
  readonly overlapAreaMm2: number | null;
  /** Why the pair was not evaluated (INVALID / UNSUPPORTED). */
  readonly notEvaluatedReason: string | null;
}

export interface RoomAnalysis {
  readonly roomId: string;
  readonly status: PairStatus;
  readonly doors: readonly DoorAnalysis[];
  readonly furniture: readonly FurnitureAnalysis[];
  readonly pairs: readonly PairAnalysis[];
}

export interface SceneAnalysis {
  readonly engineVersion: string;
  readonly settings: AnalysisSettings;
  readonly status: PairStatus;
  readonly rooms: readonly RoomAnalysis[];
  readonly issues: readonly Issue[];
  readonly pairCount: number;
}

const SIDE_NAME = { south: 'south', east: 'east', north: 'north', west: 'west' } as const;

function wallEndName(side: Room['walls'][number]['side'], atEnd: boolean): string {
  // Walls run counter-clockwise: south W->E, east S->N, north E->W, west N->S.
  const names = { south: ['west', 'east'], east: ['south', 'north'], north: ['east', 'west'], west: ['north', 'south'] } as const;
  return names[side][atEnd ? 1 : 0];
}

function openingInterval(door: Door): [number, number] {
  return door.leafDirection === 'toward-end'
    ? [door.hingeOffsetMm, door.hingeOffsetMm + door.leafWidthMm]
    : [door.hingeOffsetMm - door.leafWidthMm, door.hingeOffsetMm];
}

export function analyzeDoorValidity(room: Room, door: Door): { validity: Validity; issues: Issue[] } {
  const issues: Issue[] = [];
  const base = { roomId: room.id, elementId: door.id };
  if (door.operation !== 'hinged-single') {
    issues.push({ ...base, code: 'door.unsupported-operation', severity: 'UNSUPPORTED', message: `${door.id} is a ${door.operation} door. Only single-leaf hinged doors are analysed.` });
  }
  if (door.swingDeg !== 90) {
    issues.push({ ...base, code: 'door.unsupported-swing-angle', severity: 'UNSUPPORTED', message: `${door.id} declares a ${door.swingDeg}° swing. Only 90° swings are analysed.` });
  }
  if (door.swingSide !== 'interior') {
    issues.push({ ...base, code: 'door.unsupported-swing-side', severity: 'UNSUPPORTED', message: `${door.id} swings outward into a space that is not modelled.` });
  }

  const wall = findWall(room, door.wallId);
  if (!wall) {
    issues.push({ ...base, code: 'door.wall-missing', severity: 'INVALID', message: `${door.id} references wall ${door.wallId}, which does not exist in ${room.id}.` });
    return { validity: 'INVALID', issues };
  }
  const segment = wallSegment(wall.side, room.widthMm, room.depthMm);
  const sideName = SIDE_NAME[wall.side];
  if (door.hingeOffsetMm < 0 || door.hingeOffsetMm > segment.length) {
    const over = door.hingeOffsetMm < 0 ? -door.hingeOffsetMm : door.hingeOffsetMm - segment.length;
    issues.push({
      ...base,
      code: 'door.hinge-outside-wall',
      severity: 'INVALID',
      message: `${door.id} hinge is ${over} mm beyond the ${wallEndName(wall.side, door.hingeOffsetMm > 0)} end of the ${sideName} wall (wall length ${segment.length} mm).`,
    });
  } else {
    const [start, end] = openingInterval(door);
    if (start < 0 || end > segment.length) {
      const over = start < 0 ? -start : end - segment.length;
      issues.push({
        ...base,
        code: 'door.leaf-outside-wall',
        severity: 'INVALID',
        message: `${door.id} leaf would extend ${over} mm beyond the ${wallEndName(wall.side, end > segment.length)} end of the ${sideName} wall (wall length ${segment.length} mm).`,
      });
    }
  }
  const reach = roomDepthFromWall(wall.side, room.widthMm, room.depthMm);
  if (door.leafWidthMm > reach) {
    issues.push({
      ...base,
      code: 'door.sweep-exceeds-room',
      severity: 'INVALID',
      message: `${door.id} leaf (${door.leafWidthMm} mm) is longer than the room is deep from the ${sideName} wall (${reach} mm).`,
    });
  }
  const [start, end] = openingInterval(door);
  for (const other of room.doors) {
    if (other.id === door.id || other.wallId !== door.wallId) continue;
    const [oStart, oEnd] = openingInterval(other);
    if (start < oEnd && oStart < end) {
      issues.push({ ...base, code: 'door.openings-overlap', severity: 'INVALID', message: `${door.id} opening overlaps ${other.id} on the ${sideName} wall.` });
    }
  }

  const validity: Validity = issues.some((i) => i.severity === 'INVALID')
    ? 'INVALID'
    : issues.length > 0
      ? 'UNSUPPORTED'
      : 'VALID';
  return { validity, issues };
}

export function analyzeFurnitureValidity(room: Room, item: Furniture): { validity: Validity; issues: Issue[] } {
  const issues: Issue[] = [];
  const base = { roomId: room.id, elementId: item.id };
  const fp = item.footprint;
  if (fp.kind !== 'rect') {
    issues.push({ ...base, code: 'furniture.unsupported-shape', severity: 'UNSUPPORTED', message: `${item.id} has a ${fp.kind} footprint. Only axis-aligned rectangles are analysed.` });
  } else {
    if (fp.rotationDeg !== 0) {
      issues.push({ ...base, code: 'furniture.unsupported-rotation', severity: 'UNSUPPORTED', message: `${item.id} is rotated ${fp.rotationDeg}°. Only unrotated, axis-aligned footprints are analysed.` });
    }
    if (fp.maxX <= fp.minX || fp.maxY <= fp.minY) {
      issues.push({ ...base, code: 'furniture.degenerate', severity: 'INVALID', message: `${item.id} has zero or negative width or depth.` });
    }
  }
  const b = footprintBounds(item);
  const overs: string[] = [];
  if (b.minX < 0) overs.push(`${-b.minX} mm beyond the west wall`);
  if (b.maxX > room.widthMm) overs.push(`${b.maxX - room.widthMm} mm beyond the east wall`);
  if (b.minY < 0) overs.push(`${-b.minY} mm beyond the south wall`);
  if (b.maxY > room.depthMm) overs.push(`${b.maxY - room.depthMm} mm beyond the north wall`);
  if (overs.length > 0) {
    issues.push({ ...base, code: 'furniture.outside-room', severity: 'INVALID', message: `${item.id} extends ${overs.join(' and ')} of ${room.id}.` });
  }
  const validity: Validity = issues.some((i) => i.severity === 'INVALID')
    ? 'INVALID'
    : issues.length > 0
      ? 'UNSUPPORTED'
      : 'VALID';
  return { validity, issues };
}

function evaluatePair(
  room: Room,
  door: Door,
  frame: DoorFrame | null,
  doorValidity: Validity,
  item: Furniture,
  itemValidity: Validity,
  settings: AnalysisSettings,
): PairAnalysis {
  const key = `${door.id}|${item.id}`;
  const notEvaluated = (status: PairStatus, reason: string): PairAnalysis => ({
    key,
    roomId: room.id,
    doorId: door.id,
    furnitureId: item.id,
    status,
    localRect: null,
    separation: null,
    strike: null,
    overlapAreaMm2: null,
    notEvaluatedReason: reason,
  });
  if (doorValidity === 'INVALID') return notEvaluated('INVALID', `${door.id} is invalid, so its swing was not evaluated against ${item.id}.`);
  if (itemValidity === 'INVALID') return notEvaluated('INVALID', `${item.id} is invalid, so it was not evaluated against ${door.id}.`);
  if (doorValidity === 'UNSUPPORTED') return notEvaluated('UNSUPPORTED', `${door.id} is outside the supported door model, so no clearance result is reported.`);
  if (itemValidity === 'UNSUPPORTED' || item.footprint.kind !== 'rect' || !frame) {
    return notEvaluated('UNSUPPORTED', `${item.id} is outside the supported footprint model, so no clearance result is reported.`);
  }
  const fp = item.footprint;
  const localRect = rectToLocal(frame, fp);
  const radius = door.leafWidthMm;
  const status = classifySeparation(radius, localRect, settings);
  return {
    key,
    roomId: room.id,
    doorId: door.id,
    furnitureId: item.id,
    status,
    localRect,
    separation: signedSeparation(radius, localRect),
    strike: strikeRange(radius, localRect),
    overlapAreaMm2: overlapAreaMm2(radius, localRect),
    notEvaluatedReason: null,
  };
}

export function analyzeRoom(room: Room, settings: AnalysisSettings): RoomAnalysis {
  const furniture: FurnitureAnalysis[] = room.furniture.map((item) => {
    const { validity, issues } = analyzeFurnitureValidity(room, item);
    return { roomId: room.id, furnitureId: item.id, validity, issues };
  });
  const furnitureById = new Map(furniture.map((f) => [f.furnitureId, f]));
  const pairs: PairAnalysis[] = [];
  const doors: DoorAnalysis[] = room.doors.map((door) => {
    const { validity, issues } = analyzeDoorValidity(room, door);
    const wall = findWall(room, door.wallId);
    const frame =
      validity === 'VALID' && wall
        ? makeDoorFrame(wall.side, room.widthMm, room.depthMm, door.hingeOffsetMm, door.leafDirection)
        : null;
    const doorPairs = room.furniture.map((item) =>
      evaluatePair(room, door, frame, validity, item, furnitureById.get(item.id)!.validity, settings),
    );
    pairs.push(...doorPairs);
    let maxOpeningDeg: number | null = null;
    let limitingFurnitureId: string | null = null;
    if (validity === 'VALID') {
      maxOpeningDeg = 90;
      for (const pair of doorPairs) {
        if ((pair.status === 'CONFLICT' || pair.status === 'CONTACT_REVIEW') && pair.strike && pair.strike.firstDeg < maxOpeningDeg) {
          maxOpeningDeg = pair.strike.firstDeg;
          limitingFurnitureId = pair.furnitureId;
        }
      }
    }
    const status =
      validity === 'INVALID' ? 'INVALID' : validity === 'UNSUPPORTED' ? 'UNSUPPORTED' : worstStatus(doorPairs.map((p) => p.status));
    return { roomId: room.id, doorId: door.id, validity, issues, frame, radiusMm: door.leafWidthMm, maxOpeningDeg, limitingFurnitureId, status };
  });
  const statuses: PairStatus[] = [
    ...doors.map((d) => d.status),
    ...pairs.map((p) => p.status),
    ...furniture.map((f) => (f.validity === 'VALID' ? 'PASS' : f.validity)),
  ];
  return { roomId: room.id, status: worstStatus(statuses), doors, furniture, pairs };
}

export function analyzeScene(scene: Scene): SceneAnalysis {
  const rooms = scene.rooms.map((room) => analyzeRoom(room, scene.settings));
  const issues = rooms.flatMap((r) => [...r.doors.flatMap((d) => d.issues), ...r.furniture.flatMap((f) => f.issues)]);
  return {
    engineVersion: ENGINE_VERSION,
    settings: scene.settings,
    status: worstStatus(rooms.map((r) => r.status)),
    rooms,
    issues,
    pairCount: rooms.reduce((n, r) => n + r.pairs.length, 0),
  };
}

export function roomAnalysis(analysis: SceneAnalysis, roomId: string): RoomAnalysis | undefined {
  return analysis.rooms.find((r) => r.roomId === roomId);
}

export function doorAnalysis(analysis: SceneAnalysis, doorId: string): DoorAnalysis | undefined {
  for (const room of analysis.rooms) {
    const door = room.doors.find((d) => d.doorId === doorId);
    if (door) return door;
  }
  return undefined;
}

export function pairsForDoor(analysis: SceneAnalysis, doorId: string): PairAnalysis[] {
  return analysis.rooms.flatMap((r) => r.pairs.filter((p) => p.doorId === doorId));
}
