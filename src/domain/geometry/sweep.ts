/**
 * Measurements of a door's swept quarter disk Q = { u >= 0, v >= 0, u^2 + v^2 <= R^2 }
 * against a door-local rectangle. All functions are pure and work in door-local mm.
 */

import type { LocalRect, Vec } from './frame';

const RAD_TO_DEG = 180 / Math.PI;

/** The rectangle clipped to the swing quadrant (u >= 0, v >= 0), or null if nothing remains. */
export function clipToQuadrant(rect: LocalRect): LocalRect | null {
  const minU = Math.max(rect.minU, 0);
  const minV = Math.max(rect.minV, 0);
  if (rect.maxU < minU || rect.maxV < minV) return null;
  return { minU, maxU: rect.maxU, minV, maxV: rect.maxV };
}

/** True when the clipped rectangle has at least one point inside or on the disk boundary. */
function reachesDisk(clipped: LocalRect, radius: number): boolean {
  return clipped.minU * clipped.minU + clipped.minV * clipped.minV <= radius * radius;
}

export interface StrikeRange {
  /** Opening angle (degrees from closed) at which the leaf first meets the rectangle. */
  readonly firstDeg: number;
  /** Largest opening angle at which the leaf still meets the rectangle. */
  readonly lastDeg: number;
  /** Where the leaf first meets the rectangle (door-local). */
  readonly firstPoint: Vec;
}

/**
 * Range of opening angles over which the leaf (segment from the hinge to R(cos t, sin t))
 * meets the rectangle. The set of such angles is the angular extent of B ∩ Q, which is
 * convex, so the range is an interval. Returns null when the leaf never meets the rectangle.
 */
export function strikeRange(radius: number, rect: LocalRect): StrikeRange | null {
  const clipped = clipToQuadrant(rect);
  if (!clipped || !reachesDisk(clipped, radius)) return null;
  const { minU: x1, maxU: x2, minV: y1, maxV: y2 } = clipped;
  const r2 = radius * radius;
  const firstU = Math.min(x2, Math.sqrt(r2 - y1 * y1));
  const lastV = Math.min(y2, Math.sqrt(r2 - x1 * x1));
  const firstDeg = firstU === 0 && y1 === 0 ? 0 : Math.atan2(y1, firstU) * RAD_TO_DEG;
  const lastDeg = x1 === 0 && lastV === 0 ? 0 : Math.atan2(lastV, x1) * RAD_TO_DEG;
  return { firstDeg, lastDeg, firstPoint: { x: firstU, y: y1 } };
}

/** Antiderivative of sqrt(R^2 - x^2). */
function circleIntegral(x: number, radius: number): number {
  const ratio = Math.min(1, Math.max(-1, x / radius));
  return 0.5 * (x * Math.sqrt(Math.max(0, radius * radius - x * x)) + radius * radius * Math.asin(ratio));
}

/** Exact (closed-form) area of B ∩ Q in mm^2. */
export function overlapAreaMm2(radius: number, rect: LocalRect): number {
  const clipped = clipToQuadrant(rect);
  if (!clipped) return 0;
  const { minU: x1, maxU: x2, minV: y1, maxV: y2 } = clipped;
  const R = radius;
  if (y1 >= R || x1 >= R) return 0;
  const r2 = R * R;
  // Beyond xBottom the arc is below y1; before xTop the arc is above y2.
  const xBottom = Math.sqrt(r2 - y1 * y1);
  const xTop = y2 >= R ? 0 : Math.sqrt(r2 - y2 * y2);
  const end = Math.min(x2, xBottom);
  if (end <= x1) return 0;
  // Full-height strip where the arc is above the rectangle top.
  const flatEnd = Math.min(end, Math.max(x1, xTop));
  const flatArea = (flatEnd - x1) * (y2 - y1);
  // Strip where the arc forms the top boundary.
  const curveStart = Math.max(x1, xTop);
  const curveArea =
    end > curveStart
      ? circleIntegral(end, R) - circleIntegral(curveStart, R) - y1 * (end - curveStart)
      : 0;
  return flatArea + curveArea;
}

function arcPoints(radius: number, fromRad: number, toRad: number, segmentsPerQuarter: number): Vec[] {
  const span = Math.abs(toRad - fromRad);
  const steps = Math.max(1, Math.ceil((span / (Math.PI / 2)) * segmentsPerQuarter));
  const points: Vec[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = fromRad + ((toRad - fromRad) * i) / steps;
    points.push({ x: radius * Math.cos(a), y: radius * Math.sin(a) });
  }
  return points;
}

/** Outline of the full swept region: hinge, closed tip, arc, open tip (door-local). */
export function sectorOutline(radius: number, segmentsPerQuarter = 96): Vec[] {
  return [{ x: 0, y: 0 }, ...arcPoints(radius, 0, Math.PI / 2, segmentsPerQuarter)];
}

/** Arc only, from the closed tip to the open tip (door-local). */
export function sweepArc(radius: number, segmentsPerQuarter = 96): Vec[] {
  return arcPoints(radius, 0, Math.PI / 2, segmentsPerQuarter);
}

/**
 * Boundary of B ∩ Q as a polygon (door-local). The arc portion is sampled, so this is for
 * display and for cross-checking overlapAreaMm2; the area itself is computed exactly.
 */
export function overlapFootprint(radius: number, rect: LocalRect, segmentsPerQuarter = 96): Vec[] {
  const clipped = clipToQuadrant(rect);
  if (!clipped || overlapAreaMm2(radius, rect) <= 0) return [];
  const { minU: x1, maxU: x2, minV: y1, maxV: y2 } = clipped;
  const R = radius;
  const r2 = R * R;
  const xBottom = Math.sqrt(r2 - y1 * y1);
  const xTop = y2 >= R ? 0 : Math.sqrt(r2 - y2 * y2);
  const points: Vec[] = [{ x: x1, y: y1 }];

  const bottomEnd = Math.min(x2, xBottom);
  points.push({ x: bottomEnd, y: y1 });

  let arcStartRad: number;
  if (x2 < xBottom) {
    // Bottom-right corner is inside the disk: climb the right edge.
    const rightTop = Math.min(y2, Math.sqrt(r2 - x2 * x2));
    points.push({ x: x2, y: rightTop });
    if (rightTop >= y2) {
      points.push({ x: x1, y: y2 });
      return points;
    }
    arcStartRad = Math.atan2(rightTop, x2);
  } else {
    arcStartRad = Math.atan2(y1, xBottom);
  }

  // Follow the arc counter-clockwise until it meets the top edge or the left edge.
  const arcEndU = Math.max(x1, xTop);
  const arcEndV = Math.sqrt(Math.max(0, r2 - arcEndU * arcEndU));
  const arcEndRad = Math.atan2(arcEndV, arcEndU);
  const arc = arcPoints(R, arcStartRad, arcEndRad, segmentsPerQuarter);
  points.push(...arc.slice(1));
  if (xTop > x1) points.push({ x: x1, y: y2 });
  return points;
}

/** Shoelace area of a simple polygon (absolute value). */
export function polygonArea(points: readonly Vec[]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    twice += a.x * b.y - b.x * a.y;
  }
  return Math.abs(twice) / 2;
}

/** Leaf tip (door-local) at an opening angle in degrees. */
export function leafTip(radius: number, openingDeg: number): Vec {
  const a = (openingDeg * Math.PI) / 180;
  return { x: radius * Math.cos(a), y: radius * Math.sin(a) };
}
