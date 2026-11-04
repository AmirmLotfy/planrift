/**
 * Cutaway render model: pure mapping from (scene, analysis) to 3D primitives in three.js world
 * metres. Every position comes from the canonical scene via planToWorld; the 3D view is a
 * visualisation, never a source of results.
 */

import type { PairStatus, SceneAnalysis } from '@/domain/analysis/analyze';
import { localToPlan, makeDoorFrame, wallSegment, type Vec } from '@/domain/geometry/frame';
import { sectorOutline } from '@/domain/geometry/sweep';
import { findWall, footprintBounds } from '@/domain/model/lookup';
import type { Furniture, Scene, Wall } from '@/domain/model/types';
import { planToWorld, roomToGlobal, type WorldPoint } from './transforms';

export interface CutawayBox {
  readonly key: string;
  readonly kind: 'wall' | 'lintel' | 'furniture' | 'floor';
  readonly elementId: string;
  readonly roomId: string;
  /** Box centre and size in world metres. */
  readonly center: WorldPoint;
  readonly size: WorldPoint;
  readonly status: PairStatus;
  readonly category?: Furniture['category'];
  readonly label?: string;
}

export interface CutawayDoor {
  readonly doorId: string;
  readonly roomId: string;
  /** Hinge axis base point (world metres). */
  readonly hinge: WorldPoint;
  /** Rotation (radians about +y) of the closed leaf direction. */
  readonly closedYaw: number;
  /** Signed rotation from closed toward open (radians); the leaf is drawn at maxOpening. */
  readonly openSign: 1 | -1;
  readonly widthM: number;
  readonly thicknessM: number;
  readonly heightM: number;
  readonly openingDeg: number;
  readonly status: PairStatus;
  readonly supported: boolean;
  /** Floor outline of the sweep (world metres, y = 0). */
  readonly sweep: WorldPoint[] | null;
  /** Hinge position in room-local plan mm, for agreement tests. */
  readonly hingePlanMm: Vec;
}

export interface CutawayModel {
  readonly boxes: readonly CutawayBox[];
  readonly doors: readonly CutawayDoor[];
  /** World-space centre of the focus room (for camera targets). */
  readonly focus: WorldPoint;
  readonly extentM: number;
}

/** Cutaway wall height: walls are cut at this height so the room reads from above. */
export const CUT_HEIGHT_MM = 1350;

function box(minX: number, minY: number, maxX: number, maxY: number, z0: number, z1: number): { center: WorldPoint; size: WorldPoint } {
  const c = planToWorld({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 }, (z0 + z1) / 2);
  return { center: c, size: [(maxX - minX) / 1000, (z1 - z0) / 1000, (maxY - minY) / 1000] };
}

export function buildCutawayModel(scene: Scene, analysis: SceneAnalysis, focusRoomId: string): CutawayModel {
  const boxes: CutawayBox[] = [];
  const doors: CutawayDoor[] = [];
  const focusRoom = scene.rooms.find((r) => r.id === focusRoomId) ?? scene.rooms[0]!;
  for (const room of scene.rooms) {
    const ra = analysis.rooms.find((r) => r.roomId === room.id)!;
    const g = (p: Vec) => roomToGlobal(room, p);
    const o = room.originMm;
    boxes.push({
      key: `${room.id}-floor`,
      kind: 'floor',
      elementId: room.id,
      roomId: room.id,
      ...box(o.x, o.y, o.x + room.widthMm, o.y + room.depthMm, -20, 0),
      status: ra.status,
    });
    const thickness = (side: Wall['side']) => room.walls.find((w) => w.side === side)?.thicknessMm ?? 0;
    for (const wall of room.walls) {
      const seg = wallSegment(wall.side, room.widthMm, room.depthMm);
      const outward = { x: -seg.n.x, y: -seg.n.y };
      const prev = { south: 'west', east: 'south', north: 'east', west: 'north' } as const;
      const next = { south: 'east', east: 'north', north: 'west', west: 'south' } as const;
      const lo = -thickness(prev[wall.side]);
      const hi = seg.length + thickness(next[wall.side]);
      const openings = room.doors
        .filter((d) => d.wallId === wall.id)
        .map((d) => (d.leafDirection === 'toward-end' ? [d.hingeOffsetMm, d.hingeOffsetMm + d.leafWidthMm, d.heightMm] : [d.hingeOffsetMm - d.leafWidthMm, d.hingeOffsetMm, d.heightMm]))
        .map(([a, b, h]) => [Math.max(a!, lo), Math.min(b!, hi), h!] as const)
        .filter(([a, b]) => b > a)
        .sort((p, q) => p[0] - q[0]);
      const pieces: [number, number, number, number][] = [];
      let cursor = lo;
      for (const [a, b, h] of openings) {
        if (a > cursor) pieces.push([cursor, a, 0, CUT_HEIGHT_MM]);
        // Wall above the door head is drawn only if it is below the cut height.
        if (h < CUT_HEIGHT_MM) pieces.push([a, b, h, CUT_HEIGHT_MM]);
        cursor = Math.max(cursor, b);
      }
      if (cursor < hi) pieces.push([cursor, hi, 0, CUT_HEIGHT_MM]);
      pieces.forEach(([a, b, z0, z1], i) => {
        const p1 = g({ x: seg.start.x + seg.t.x * a, y: seg.start.y + seg.t.y * a });
        const p2 = g({ x: seg.start.x + seg.t.x * b, y: seg.start.y + seg.t.y * b });
        const q1 = { x: p1.x + outward.x * wall.thicknessMm, y: p1.y + outward.y * wall.thicknessMm };
        const q2 = { x: p2.x + outward.x * wall.thicknessMm, y: p2.y + outward.y * wall.thicknessMm };
        const xs = [p1.x, p2.x, q1.x, q2.x];
        const ys = [p1.y, p2.y, q1.y, q2.y];
        boxes.push({
          key: `${wall.id}-${i}`,
          kind: z0 > 0 ? 'lintel' : 'wall',
          elementId: wall.id,
          roomId: room.id,
          ...box(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), z0, z1),
          status: 'PASS',
        });
      });
    }
    const worst = new Map<string, PairStatus>();
    const order: PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED', 'CONTACT_REVIEW', 'NEAR_CLEARANCE', 'PASS'];
    for (const p of ra.pairs) {
      const c = worst.get(p.furnitureId);
      if (!c || order.indexOf(p.status) < order.indexOf(c)) worst.set(p.furnitureId, p.status);
    }
    for (const item of room.furniture) {
      const b = footprintBounds(item);
      const gmin = g({ x: b.minX, y: b.minY });
      const gmax = g({ x: b.maxX, y: b.maxY });
      boxes.push({
        key: item.id,
        kind: 'furniture',
        elementId: item.id,
        roomId: room.id,
        ...box(gmin.x, gmin.y, gmax.x, gmax.y, 0, item.heightMm),
        status: worst.get(item.id) ?? 'PASS',
        category: item.category,
        label: item.id,
      });
    }
    for (const door of room.doors) {
      const wall = findWall(room, door.wallId);
      const da = ra.doors.find((d) => d.doorId === door.id);
      if (!wall || !da) continue;
      const frame = da.frame ?? makeDoorFrame(wall.side, room.widthMm, room.depthMm, door.hingeOffsetMm, door.leafDirection);
      const hingeGlobal = g(frame.hinge);
      // World yaw of a plan direction d: three.js rotation.y rotates +x toward −z, and plan +y maps to −z.
      const yawOf = (d: Vec) => Math.atan2(d.y, d.x);
      const closedYaw = yawOf(frame.u);
      const cross = frame.u.x * frame.v.y - frame.u.y * frame.v.x;
      const supported = da.validity !== 'UNSUPPORTED';
      doors.push({
        doorId: door.id,
        roomId: room.id,
        hinge: planToWorld(hingeGlobal, 0),
        closedYaw,
        openSign: cross > 0 ? 1 : -1,
        widthM: door.leafWidthMm / 1000,
        thicknessM: door.leafThicknessMm / 1000,
        heightM: door.heightMm / 1000,
        openingDeg: !supported ? 0 : (da.maxOpeningDeg ?? 90),
        status: da.status,
        supported,
        sweep: supported ? sectorOutline(door.leafWidthMm, 48).map((q) => planToWorld(g(localToPlan(frame, q)), 4)) : null,
        hingePlanMm: frame.hinge,
      });
    }
  }
  const fo = focusRoom.originMm;
  return {
    boxes,
    doors,
    focus: planToWorld({ x: fo.x + focusRoom.widthMm / 2, y: fo.y + focusRoom.depthMm / 2 }, 0),
    extentM: Math.max(focusRoom.widthMm, focusRoom.depthMm) / 1000,
  };
}
