/**
 * Plan render model: a pure mapping from (scene, analysis) to drawing primitives in global
 * plan millimetres (y north). Components draw these primitives and nothing else, so the plan
 * can never disagree with the analysis.
 */

import type { DoorAnalysis, PairAnalysis, PairStatus, SceneAnalysis } from '@/domain/analysis/analyze';
import type { HingeMap } from '@/domain/analysis/hingeMap';
import { localToPlan, makeDoorFrame, wallSegment, type DoorFrame, type Vec } from '@/domain/geometry/frame';
import { leafTip, overlapFootprint, sectorOutline, sweepArc } from '@/domain/geometry/sweep';
import { findWall, footprintBounds } from '@/domain/model/lookup';
import type { Door, Furniture, Room, Scene, Wall } from '@/domain/model/types';
import { roomToGlobal } from './transforms';

export interface PlanBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PlanWallPiece {
  readonly key: string;
  readonly wallId: string;
  readonly polygon: Vec[];
}

export interface PlanFurniture {
  readonly furnitureId: string;
  readonly roomId: string;
  readonly name: string;
  readonly category: Furniture['category'];
  readonly status: PairStatus;
  readonly supported: boolean;
  readonly polygon: Vec[];
  readonly center: Vec;
  readonly widthMm: number;
  readonly depthMm: number;
  readonly selected: boolean;
}

export interface PlanSegment {
  readonly from: Vec;
  readonly to: Vec;
}

export interface PlanClearance extends PlanSegment {
  readonly furnitureId: string;
  readonly valueMm: number;
  readonly status: PairStatus;
}

export interface PlanFootprint {
  readonly furnitureId: string;
  readonly status: PairStatus;
  readonly polygon: Vec[];
}

export interface PlanHingeBand extends PlanSegment {
  readonly fromMm: number;
  readonly toMm: number;
  readonly status: PairStatus;
  readonly limitingIds: readonly string[];
}

export interface PlanDoor {
  readonly doorId: string;
  readonly roomId: string;
  readonly name: string;
  readonly validity: DoorAnalysis['validity'];
  readonly status: PairStatus;
  readonly selected: boolean;
  readonly hingeOffsetMm: number;
  readonly leafWidthMm: number;
  readonly leafDirection: Door['leafDirection'];
  /** Hinge offsets for which the leaf fits within the wall (drag range). */
  readonly dragRange: readonly [number, number];
  readonly wallLengthMm: number;
  readonly wallSide: Wall['side'];
  readonly wallThicknessMm: number;
  /** Global unit vector along the wall (start → end) and outward normal. */
  readonly tangent: Vec;
  readonly outward: Vec;
  readonly wallStart: Vec;
  readonly hinge: Vec;
  readonly openingFrom: Vec;
  readonly openingTo: Vec;
  /** Full swept region (null when the door is unsupported). */
  readonly sweep: Vec[] | null;
  readonly arc: Vec[] | null;
  /** Leaf rectangle at the drawn angle. */
  readonly leaf: Vec[];
  readonly leafAngleDeg: number;
  /** Fully open leaf outline, shown dashed when the leaf is blocked before 90°. */
  readonly ghostLeaf: Vec[] | null;
  readonly strike: { readonly point: Vec; readonly deg: number; readonly furnitureId: string } | null;
  readonly footprints: readonly PlanFootprint[];
  readonly clearance: PlanClearance | null;
  readonly intrusion: PlanClearance | null;
  readonly hingeBands: readonly PlanHingeBand[];
  readonly tagAt: Vec;
}

export interface PlanRoom {
  readonly roomId: string;
  readonly name: string;
  readonly status: PairStatus;
  readonly interior: Vec[];
  readonly labelAt: Vec;
  readonly widthMm: number;
  readonly depthMm: number;
  readonly origin: Vec;
  readonly walls: readonly PlanWallPiece[];
  readonly doors: readonly PlanDoor[];
  readonly furniture: readonly PlanFurniture[];
}

export interface PlanModel {
  readonly bounds: PlanBounds;
  readonly rooms: readonly PlanRoom[];
}

export interface PlanModelOptions {
  readonly selectedId?: string | null;
  /** Hinge maps keyed by door ID (precomputed and memoised by the caller). */
  readonly hingeMaps?: ReadonlyMap<string, HingeMap>;
  /** Distance of the hinge-map strip outside the wall face (mm). */
  readonly hingeMapOffsetMm?: number;
}

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });

function rectPolygon(minX: number, minY: number, maxX: number, maxY: number): Vec[] {
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

function openingInterval(door: Door): [number, number] {
  return door.leafDirection === 'toward-end'
    ? [door.hingeOffsetMm, door.hingeOffsetMm + door.leafWidthMm]
    : [door.hingeOffsetMm - door.leafWidthMm, door.hingeOffsetMm];
}

const NEXT: Record<Wall['side'], Wall['side']> = { south: 'east', east: 'north', north: 'west', west: 'south' };
const PREV: Record<Wall['side'], Wall['side']> = { south: 'west', east: 'south', north: 'east', west: 'north' };

function wallPieces(room: Room): PlanWallPiece[] {
  const thickness = (side: Wall['side']) => room.walls.find((w) => w.side === side)?.thicknessMm ?? 0;
  const pieces: PlanWallPiece[] = [];
  for (const wall of room.walls) {
    const seg = wallSegment(wall.side, room.widthMm, room.depthMm);
    const outward = scale(seg.n, -1);
    const lo = -thickness(PREV[wall.side]);
    const hi = seg.length + thickness(NEXT[wall.side]);
    const cuts = room.doors
      .filter((d) => d.wallId === wall.id)
      .map(openingInterval)
      .map(([a, b]) => [Math.max(a, lo), Math.min(b, hi)] as const)
      .filter(([a, b]) => b > a)
      .sort((p, q) => p[0] - q[0]);
    const intervals: [number, number][] = [];
    let cursor = lo;
    for (const [a, b] of cuts) {
      if (a > cursor) intervals.push([cursor, a]);
      cursor = Math.max(cursor, b);
    }
    if (cursor < hi) intervals.push([cursor, hi]);
    intervals.forEach(([a, b], i) => {
      const p = (offset: number) => roomToGlobal(room, add(seg.start, scale(seg.t, offset)));
      const pa = p(a);
      const pb = p(b);
      const o = scale(outward, wall.thicknessMm);
      pieces.push({ key: `${wall.id}-${i}`, wallId: wall.id, polygon: [pa, pb, add(pb, o), add(pa, o)] });
    });
  }
  return pieces;
}

function leafPolygon(frame: DoorFrame, radius: number, thickness: number, deg: number, toGlobal: (p: Vec) => Vec): Vec[] {
  const a = (deg * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  // Leaf thickness lies on the side away from the sweep interior (toward the closed side).
  const side = { x: Math.sin(a), y: -Math.cos(a) };
  const tip = scale(dir, radius);
  const t = scale(side, thickness);
  return [{ x: 0, y: 0 }, tip, add(tip, t), t].map((q) => toGlobal(localToPlan(frame, q)));
}

function pairWorst(pairs: readonly PairAnalysis[]): Map<string, PairStatus> {
  const order: PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED', 'CONTACT_REVIEW', 'NEAR_CLEARANCE', 'PASS'];
  const worst = new Map<string, PairStatus>();
  for (const p of pairs) {
    const current = worst.get(p.furnitureId);
    if (!current || order.indexOf(p.status) < order.indexOf(current)) worst.set(p.furnitureId, p.status);
  }
  return worst;
}

function buildDoor(room: Room, door: Door, analysis: DoorAnalysis, pairs: readonly PairAnalysis[], options: PlanModelOptions): PlanDoor | null {
  const wall = findWall(room, door.wallId);
  if (!wall) return null;
  const seg = wallSegment(wall.side, room.widthMm, room.depthMm);
  const toGlobal = (p: Vec) => roomToGlobal(room, p);
  // Display frame: valid doors use the analysis frame; invalid ones are drawn where requested.
  const frame = analysis.frame ?? makeDoorFrame(wall.side, room.widthMm, room.depthMm, door.hingeOffsetMm, door.leafDirection);
  const R = door.leafWidthMm;
  const supported = analysis.validity !== 'UNSUPPORTED';
  const blockedDeg = analysis.maxOpeningDeg;
  const leafAngleDeg = !supported ? 0 : blockedDeg === null ? 90 : blockedDeg;
  const strikePair = analysis.limitingFurnitureId ? pairs.find((p) => p.furnitureId === analysis.limitingFurnitureId) : undefined;
  const footprints: PlanFootprint[] = pairs
    .filter((p) => p.localRect && (p.status === 'CONFLICT' || p.status === 'CONTACT_REVIEW') && (p.overlapAreaMm2 ?? 0) > 0)
    .map((p) => ({
      furnitureId: p.furnitureId,
      status: p.status,
      polygon: overlapFootprint(R, p.localRect!, 64).map((q) => toGlobal(localToPlan(frame, q))),
    }));
  const evaluated = pairs.filter((p) => p.separation);
  const governing = evaluated.length
    ? evaluated.reduce((min, p) => (p.separation!.valueMm < min.separation!.valueMm ? p : min))
    : undefined;
  const segmentOf = (p: PairAnalysis): PlanClearance => ({
    from: toGlobal(localToPlan(frame, p.separation!.sectorPoint)),
    to: toGlobal(localToPlan(frame, p.separation!.rectPoint)),
    furnitureId: p.furnitureId,
    valueMm: p.separation!.valueMm,
    status: p.status,
  });
  const map = options.hingeMaps?.get(door.id);
  const stripOffset = wall.thicknessMm + (options.hingeMapOffsetMm ?? 160);
  const outward = scale(seg.n, -1);
  const along = (offset: number, out: number) => toGlobal(add(add(seg.start, scale(seg.t, offset)), scale(outward, out)));
  const [openA, openB] = openingInterval(door);
  const hinge = toGlobal(frame.hinge);
  return {
    doorId: door.id,
    roomId: room.id,
    name: door.name,
    validity: analysis.validity,
    status: analysis.status,
    selected: options.selectedId === door.id,
    hingeOffsetMm: door.hingeOffsetMm,
    leafWidthMm: R,
    leafDirection: door.leafDirection,
    dragRange: door.leafDirection === 'toward-end' ? [0, Math.max(0, seg.length - R)] : [Math.min(R, seg.length), seg.length],
    wallLengthMm: seg.length,
    wallSide: wall.side,
    wallThicknessMm: wall.thicknessMm,
    tangent: seg.t,
    outward,
    wallStart: toGlobal(seg.start),
    hinge,
    openingFrom: along(openA, 0),
    openingTo: along(openB, 0),
    sweep: supported ? sectorOutline(R, 72).map((q) => toGlobal(localToPlan(frame, q))) : null,
    arc: supported ? sweepArc(R, 72).map((q) => toGlobal(localToPlan(frame, q))) : null,
    leaf: leafPolygon(frame, R, door.leafThicknessMm, leafAngleDeg, toGlobal),
    leafAngleDeg,
    ghostLeaf: supported && leafAngleDeg < 90 ? leafPolygon(frame, R, door.leafThicknessMm, 90, toGlobal) : null,
    strike:
      strikePair?.strike && blockedDeg !== null && blockedDeg < 90
        ? { point: toGlobal(localToPlan(frame, strikePair.strike.firstPoint)), deg: blockedDeg, furnitureId: strikePair.furnitureId }
        : null,
    footprints,
    clearance: governing && governing.separation!.valueMm > 0 ? segmentOf(governing) : null,
    intrusion: governing && governing.status === 'CONFLICT' ? segmentOf(governing) : null,
    hingeBands: map
      ? map.segments.map((s) => ({
          from: along(s.fromMm, stripOffset),
          to: along(s.toMm + (s.toMm < map.wallLengthMm ? 1 : 0), stripOffset),
          fromMm: s.fromMm,
          toMm: s.toMm,
          status: s.status,
          limitingIds: s.limitingIds,
        }))
      : [],
    tagAt: toGlobal(localToPlan(frame, leafTip(R * 0.62, 45))),
  };
}

export function buildPlanModel(scene: Scene, analysis: SceneAnalysis, options: PlanModelOptions = {}): PlanModel {
  const rooms: PlanRoom[] = scene.rooms.map((room) => {
    const roomAnalysis = analysis.rooms.find((r) => r.roomId === room.id)!;
    const worst = pairWorst(roomAnalysis.pairs);
    const furniture: PlanFurniture[] = room.furniture.map((item) => {
      const b = footprintBounds(item);
      const fp = item.footprint;
      const validity = roomAnalysis.furniture.find((f) => f.furnitureId === item.id)?.validity ?? 'VALID';
      let polygon: Vec[];
      if (fp.kind === 'polygon') polygon = fp.points.map((p) => roomToGlobal(room, p));
      else if (fp.kind === 'circle') {
        polygon = Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * 2 * Math.PI;
          return roomToGlobal(room, { x: fp.cx + fp.radiusMm * Math.cos(a), y: fp.cy + fp.radiusMm * Math.sin(a) });
        });
      } else polygon = rectPolygon(b.minX, b.minY, b.maxX, b.maxY).map((p) => roomToGlobal(room, p));
      return {
        furnitureId: item.id,
        roomId: room.id,
        name: item.name,
        category: item.category,
        status: validity === 'INVALID' ? 'INVALID' : (worst.get(item.id) ?? 'PASS'),
        supported: validity === 'VALID',
        polygon,
        center: roomToGlobal(room, { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }),
        widthMm: b.maxX - b.minX,
        depthMm: b.maxY - b.minY,
        selected: options.selectedId === item.id,
      };
    });
    const doors = room.doors
      .map((door) => {
        const doorAnalysis = roomAnalysis.doors.find((d) => d.doorId === door.id)!;
        return buildDoor(room, door, doorAnalysis, roomAnalysis.pairs.filter((p) => p.doorId === door.id), options);
      })
      .filter((d): d is PlanDoor => d !== null);
    return {
      roomId: room.id,
      name: room.name,
      status: roomAnalysis.status,
      interior: rectPolygon(0, 0, room.widthMm, room.depthMm).map((p) => roomToGlobal(room, p)),
      labelAt: roomToGlobal(room, { x: room.widthMm / 2, y: room.depthMm / 2 }),
      widthMm: room.widthMm,
      depthMm: room.depthMm,
      origin: room.originMm,
      walls: wallPieces(room),
      doors,
      furniture,
    };
  });
  const xs: number[] = [];
  const ys: number[] = [];
  for (const room of rooms) {
    const points = [...room.walls.flatMap((w) => w.polygon), ...room.doors.flatMap((d) => [...(d.sweep ?? []), ...d.leaf])];
    for (const p of points) {
      xs.push(p.x);
      ys.push(p.y);
    }
  }
  return {
    bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
    rooms,
  };
}

/** Crop around rooms including space for the hinge map and dimension strings (global plan mm). */
export function cropForRooms(
  model: PlanModel,
  roomIds: readonly string[],
  padding = { west: 900, east: 420, south: 1500, north: 420 },
): PlanBounds {
  const rooms = model.rooms.filter((r) => roomIds.includes(r.roomId));
  const xs = rooms.flatMap((r) => r.walls.flatMap((w) => w.polygon.map((p) => p.x)));
  const ys = rooms.flatMap((r) => r.walls.flatMap((w) => w.polygon.map((p) => p.y)));
  return {
    minX: Math.min(...xs) - padding.west,
    maxX: Math.max(...xs) + padding.east,
    minY: Math.min(...ys) - padding.south,
    maxY: Math.max(...ys) + padding.north,
  };
}

/** Expands a crop symmetrically so its aspect ratio (width / height) matches a viewport. */
export function fitCropToAspect(crop: PlanBounds, aspect: number): PlanBounds {
  if (!Number.isFinite(aspect) || aspect <= 0) return crop;
  const width = crop.maxX - crop.minX;
  const height = crop.maxY - crop.minY;
  if (width / height < aspect) {
    const extra = (height * aspect - width) / 2;
    return { ...crop, minX: crop.minX - extra, maxX: crop.maxX + extra };
  }
  const extra = (width / aspect - height) / 2;
  return { ...crop, minY: crop.minY - extra, maxY: crop.maxY + extra };
}
