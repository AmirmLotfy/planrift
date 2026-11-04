/**
 * Signed separation between a door's swept quarter disk and a rectangular footprint.
 *
 * In the door-local frame the swept region of a 90-degree swing with leaf length R is
 *   Q = { (u, v) : u >= 0, v >= 0, u^2 + v^2 <= R^2 }.
 * For convex compact sets the signed separation is
 *   s = max over unit directions d of [ min_{b in B} b.d - max_{q in Q} q.d ]
 * which equals the Euclidean distance when disjoint and minus the penetration depth
 * (minimum translation that separates them) when they overlap.
 *
 * Because the support functions of Q and of an axis-aligned rectangle are piecewise per
 * quadrant of d, the maximum is attained at one of eight closed-form candidates.
 * Status predicates compare against integer thresholds with exact integer arithmetic.
 * See docs/geometry/GEOMETRY_CONTRACT.md section 4.
 */

import type { LocalRect, Vec } from './frame';

export type SeparationMode =
  /** S1: the rectangle's nearest corner against the swing arc. */
  | 'radial'
  /** S2: the rectangle lies past the open leaf, nearest to its tip. */
  | 'open-leaf-tip'
  /** S3: the rectangle lies behind the hinge. */
  | 'hinge'
  /** S4: the rectangle lies past the closed leaf tip, behind the wall line. */
  | 'closed-leaf-tip'
  /** E0: the rectangle lies beyond the closed leaf's end (+u). */
  | 'beyond-closed-leaf'
  /** E1: the rectangle lies beyond the open leaf's tip (+v). */
  | 'beyond-open-leaf'
  /** E2: the rectangle lies behind the fully open leaf (-u). */
  | 'behind-open-leaf'
  /** E3: the rectangle lies behind the wall line (-v). */
  | 'behind-wall';

type Candidate =
  | { readonly mode: SeparationMode; readonly kind: 'linear'; readonly value: number }
  /** Represents sqrt(n) - c with integer n >= 0 and integer c. */
  | { readonly mode: SeparationMode; readonly kind: 'root'; readonly n: number; readonly c: number };

export interface Separation {
  /** Signed separation in mm (positive gap, negative penetration). Float, for display. */
  readonly valueMm: number;
  readonly mode: SeparationMode;
  /** Unit direction (door-local) along which the separation is measured. */
  readonly direction: Vec;
  /** Witness point on the swept region (door-local). */
  readonly sectorPoint: Vec;
  /** Witness point on the rectangle (door-local). */
  readonly rectPoint: Vec;
}

function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer (mm); received ${String(value)}`);
  }
}

function assertInputs(radius: number, rect: LocalRect): void {
  assertSafeInteger(radius, 'radius');
  assertSafeInteger(rect.minU, 'rect.minU');
  assertSafeInteger(rect.maxU, 'rect.maxU');
  assertSafeInteger(rect.minV, 'rect.minV');
  assertSafeInteger(rect.maxV, 'rect.maxV');
  if (radius <= 0) throw new RangeError('radius must be positive');
  if (rect.minU > rect.maxU || rect.minV > rect.maxV) throw new RangeError('rect is malformed (min > max)');
}

/** Candidate order doubles as the deterministic tie-break priority. */
function candidates(radius: number, rect: LocalRect): Candidate[] {
  const { minU: a1, maxU: a2, minV: b1, maxV: b2 } = rect;
  const R = radius;
  const list: Candidate[] = [];
  if (a1 > 0 && b1 > 0) list.push({ mode: 'radial', kind: 'root', n: a1 * a1 + b1 * b1, c: R });
  if (a2 < 0 && b1 > R) list.push({ mode: 'open-leaf-tip', kind: 'root', n: a2 * a2 + (b1 - R) * (b1 - R), c: 0 });
  if (a2 < 0 && b2 < 0) list.push({ mode: 'hinge', kind: 'root', n: a2 * a2 + b2 * b2, c: 0 });
  if (a1 > R && b2 < 0) list.push({ mode: 'closed-leaf-tip', kind: 'root', n: (a1 - R) * (a1 - R) + b2 * b2, c: 0 });
  list.push({ mode: 'beyond-closed-leaf', kind: 'linear', value: a1 - R });
  list.push({ mode: 'beyond-open-leaf', kind: 'linear', value: b1 - R });
  list.push({ mode: 'behind-open-leaf', kind: 'linear', value: -a2 });
  list.push({ mode: 'behind-wall', kind: 'linear', value: -b2 });
  return list;
}

function candidateValue(candidate: Candidate): number {
  return candidate.kind === 'linear' ? candidate.value : Math.sqrt(candidate.n) - candidate.c;
}

/** Exact sign of (candidate - k) for integer k. */
function compareCandidate(candidate: Candidate, k: number): -1 | 0 | 1 {
  if (candidate.kind === 'linear') {
    const d = candidate.value - k;
    return d > 0 ? 1 : d < 0 ? -1 : 0;
  }
  const m = k + candidate.c;
  if (m < 0) return 1; // sqrt(n) >= 0 > m
  const d = candidate.n - m * m;
  return d > 0 ? 1 : d < 0 ? -1 : 0;
}

/**
 * Exact sign of (s - k) for an integer threshold k, where s is the signed separation.
 * s >= k iff some candidate >= k; s > k iff some candidate > k.
 */
export function compareSeparation(radius: number, rect: LocalRect, k: number): -1 | 0 | 1 {
  assertInputs(radius, rect);
  assertSafeInteger(k, 'threshold');
  let sawEqual = false;
  for (const candidate of candidates(radius, rect)) {
    const cmp = compareCandidate(candidate, k);
    if (cmp > 0) return 1;
    if (cmp === 0) sawEqual = true;
  }
  return sawEqual ? 0 : -1;
}

const clamp = (value: number, lo: number, hi: number): number => Math.min(Math.max(value, lo), hi);

/** Midpoint of the overlap of two intervals, or the clamp of b's midpoint into a when they do not overlap. */
function overlapMid(aLo: number, aHi: number, bLo: number, bHi: number): number {
  const lo = Math.max(aLo, bLo);
  const hi = Math.min(aHi, bHi);
  if (lo <= hi) return (lo + hi) / 2;
  return clamp((bLo + bHi) / 2, aLo, aHi);
}

function unit(x: number, y: number): Vec {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 1, y: 0 } : { x: x / length, y: y / length };
}

function witness(mode: SeparationMode, radius: number, rect: LocalRect): Omit<Separation, 'valueMm' | 'mode'> {
  const { minU: a1, maxU: a2, minV: b1, maxV: b2 } = rect;
  const R = radius;
  switch (mode) {
    case 'radial': {
      const direction = unit(a1, b1);
      return { direction, rectPoint: { x: a1, y: b1 }, sectorPoint: { x: direction.x * R, y: direction.y * R } };
    }
    case 'open-leaf-tip':
      return { direction: unit(a2, b1 - R), rectPoint: { x: a2, y: b1 }, sectorPoint: { x: 0, y: R } };
    case 'hinge':
      return { direction: unit(a2, b2), rectPoint: { x: a2, y: b2 }, sectorPoint: { x: 0, y: 0 } };
    case 'closed-leaf-tip':
      return { direction: unit(a1 - R, b2), rectPoint: { x: a1, y: b2 }, sectorPoint: { x: R, y: 0 } };
    case 'beyond-closed-leaf':
      return { direction: { x: 1, y: 0 }, rectPoint: { x: a1, y: clamp(0, b1, b2) }, sectorPoint: { x: R, y: 0 } };
    case 'beyond-open-leaf':
      return { direction: { x: 0, y: 1 }, rectPoint: { x: clamp(0, a1, a2), y: b1 }, sectorPoint: { x: 0, y: R } };
    case 'behind-open-leaf': {
      const v = overlapMid(0, R, b1, b2);
      return { direction: { x: -1, y: 0 }, rectPoint: { x: a2, y: clamp(v, b1, b2) }, sectorPoint: { x: 0, y: v } };
    }
    case 'behind-wall': {
      const u = overlapMid(0, R, a1, a2);
      return { direction: { x: 0, y: -1 }, rectPoint: { x: clamp(u, a1, a2), y: b2 }, sectorPoint: { x: u, y: 0 } };
    }
  }
}

/** Signed separation with the governing candidate and witness geometry. */
export function signedSeparation(radius: number, rect: LocalRect): Separation {
  assertInputs(radius, rect);
  let best: Candidate | undefined;
  let bestValue = -Infinity;
  for (const candidate of candidates(radius, rect)) {
    const value = candidateValue(candidate);
    if (value > bestValue) {
      best = candidate;
      bestValue = value;
    }
  }
  if (!best) throw new Error('unreachable: candidate list is never empty');
  return { valueMm: bestValue, mode: best.mode, ...witness(best.mode, radius, rect) };
}

export type GeometricStatus = 'PASS' | 'NEAR_CLEARANCE' | 'CONTACT_REVIEW' | 'CONFLICT';

export interface ClearanceSettings {
  /** Contact tolerance tau (mm). |s| <= tau is reported as CONTACT_REVIEW. */
  readonly contactToleranceMm: number;
  /** Advisory threshold T (mm). tau < s < T is reported as NEAR_CLEARANCE. */
  readonly nearClearanceMm: number;
}

/** Classifies with exact integer predicates; floating-point never decides a status. */
export function classifySeparation(radius: number, rect: LocalRect, settings: ClearanceSettings): GeometricStatus {
  const tau = settings.contactToleranceMm;
  const near = settings.nearClearanceMm;
  assertSafeInteger(tau, 'contactToleranceMm');
  assertSafeInteger(near, 'nearClearanceMm');
  if (tau < 0 || near <= tau) throw new RangeError('settings must satisfy 0 <= contactToleranceMm < nearClearanceMm');
  if (compareSeparation(radius, rect, -tau) < 0) return 'CONFLICT';
  if (compareSeparation(radius, rect, tau) <= 0) return 'CONTACT_REVIEW';
  if (compareSeparation(radius, rect, near) < 0) return 'NEAR_CLEARANCE';
  return 'PASS';
}
