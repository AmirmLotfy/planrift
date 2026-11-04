/**
 * The only place where canonical coordinates are converted for display.
 *
 * - Room-local plan mm  → global plan mm: add the room origin.
 * - Global plan mm (y north) → SVG user units (mm, y down): negate y.
 * - Global plan mm → three.js world metres: x/1000, height/1000, −y/1000 (north is −z).
 */

import type { Vec } from '@/domain/geometry/frame';
import type { Room } from '@/domain/model/types';

export function roomToGlobal(room: Pick<Room, 'originMm'>, p: Vec): Vec {
  return { x: p.x + room.originMm.x, y: p.y + room.originMm.y };
}

export function globalToRoom(room: Pick<Room, 'originMm'>, p: Vec): Vec {
  return { x: p.x - room.originMm.x, y: p.y - room.originMm.y };
}

export function planToSvg(p: Vec): Vec {
  return { x: p.x, y: p.y === 0 ? 0 : -p.y };
}

export function svgToPlan(p: Vec): Vec {
  return { x: p.x, y: p.y === 0 ? 0 : -p.y };
}

export type WorldPoint = readonly [number, number, number];

export function planToWorld(p: Vec, heightMm = 0): WorldPoint {
  return [p.x / 1000, heightMm / 1000, p.y === 0 ? 0 : -p.y / 1000];
}

export function worldToPlan(w: WorldPoint): { plan: Vec; heightMm: number } {
  return { plan: { x: w[0] * 1000, y: w[2] === 0 ? 0 : -w[2] * 1000 }, heightMm: w[1] * 1000 };
}

/** SVG path data for a closed polygon in global plan coordinates. */
export function svgPath(points: readonly Vec[], closed = true): string {
  if (points.length === 0) return '';
  const parts = points.map((p, i) => {
    const s = planToSvg(p);
    return `${i === 0 ? 'M' : 'L'}${round(s.x)} ${round(s.y)}`;
  });
  return parts.join(' ') + (closed ? ' Z' : '');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
