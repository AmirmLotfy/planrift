/**
 * Independent test oracles for the door-sweep solver.
 *
 * These deliberately avoid the production algorithm (quadrant support-function candidates).
 * They only use: point-to-rectangle distance by clamping, point-to-quarter-disk distance by
 * elementary geometry, an interior-overlap predicate, and brute-force search over
 * translation directions.
 */

export interface Rect {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

interface P {
  x: number;
  y: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

function distPointRect(p: P, r: Rect): number {
  const dx = p.x - clamp(p.x, r.minU, r.maxU);
  const dy = p.y - clamp(p.y, r.minV, r.maxV);
  return Math.hypot(dx, dy);
}

function distPointSegment(p: P, a: P, b: P): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby), 0, 1);
  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

/** Distance from p to the closed quarter disk {x>=0, y>=0, x^2+y^2<=R^2}. */
function distPointQuarterDisk(p: P, R: number): number {
  const inside = p.x >= 0 && p.y >= 0 && p.x * p.x + p.y * p.y <= R * R;
  if (inside) return 0;
  const toEdges = Math.min(
    distPointSegment(p, { x: 0, y: 0 }, { x: R, y: 0 }),
    distPointSegment(p, { x: 0, y: 0 }, { x: 0, y: R }),
  );
  let toArc = Infinity;
  if (p.x >= 0 && p.y >= 0) {
    toArc = Math.abs(Math.hypot(p.x, p.y) - R);
  } else {
    toArc = Math.min(Math.hypot(p.x - R, p.y), Math.hypot(p.x, p.y - R));
  }
  return Math.min(toEdges, toArc);
}

function cross(o: P, a: P, b: P): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

function segmentsIntersect(p1: P, p2: P, q1: P, q2: P): boolean {
  const d1 = cross(q1, q2, p1);
  const d2 = cross(q1, q2, p2);
  const d3 = cross(p1, p2, q1);
  const d4 = cross(p1, p2, q2);
  return d1 * d2 <= 0 && d3 * d4 <= 0;
}

/** Exact-ish distance between a segment and a closed rectangle (0 when they touch or cross). */
export function segmentRectDistance(a: P, b: P, r: Rect): number {
  const inside = (p: P) => p.x >= r.minU && p.x <= r.maxU && p.y >= r.minV && p.y <= r.maxV;
  if (inside(a) || inside(b)) return 0;
  const corners: P[] = [
    { x: r.minU, y: r.minV },
    { x: r.maxU, y: r.minV },
    { x: r.maxU, y: r.maxV },
    { x: r.minU, y: r.maxV },
  ];
  for (let i = 0; i < 4; i += 1) {
    if (segmentsIntersect(a, b, corners[i]!, corners[(i + 1) % 4]!)) return 0;
  }
  return Math.min(distPointRect(a, r), distPointRect(b, r), ...corners.map((c) => distPointSegment(c, a, b)));
}

/** True when the rectangle and the quarter disk share interior points (positive-area overlap). */
export function interiorsOverlap(R: number, r: Rect): boolean {
  if (r.maxU <= 0 || r.maxV <= 0) return false;
  const nu = Math.max(r.minU, 0);
  const nv = Math.max(r.minV, 0);
  return nu * nu + nv * nv < R * R;
}

/** Distance between disjoint shapes by dense boundary sampling (upper bound, converges quickly). */
export function sampledDistance(R: number, r: Rect, samples = 2000): number {
  let best = Infinity;
  for (let i = 0; i <= samples; i += 1) {
    const a = (Math.PI / 2) * (i / samples);
    best = Math.min(best, distPointRect({ x: R * Math.cos(a), y: R * Math.sin(a) }, r));
    const t = (R * i) / samples;
    best = Math.min(best, distPointRect({ x: t, y: 0 }, r), distPointRect({ x: 0, y: t }, r));
  }
  const edges: [P, P][] = [
    [{ x: r.minU, y: r.minV }, { x: r.maxU, y: r.minV }],
    [{ x: r.maxU, y: r.minV }, { x: r.maxU, y: r.maxV }],
    [{ x: r.maxU, y: r.maxV }, { x: r.minU, y: r.maxV }],
    [{ x: r.minU, y: r.maxV }, { x: r.minU, y: r.minV }],
  ];
  for (const [a, b] of edges) {
    for (let i = 0; i <= samples / 4; i += 1) {
      const t = i / (samples / 4);
      best = Math.min(best, distPointQuarterDisk({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, R));
    }
  }
  return best;
}

/**
 * Penetration depth by brute force: for each sampled direction, binary-search the smallest
 * translation of the rectangle along it that removes the interior overlap; take the minimum.
 */
export function searchedPenetrationDepth(R: number, r: Rect, directions = 1440): number {
  let best = Infinity;
  const span = Math.max(Math.abs(r.minU), Math.abs(r.maxU), Math.abs(r.minV), Math.abs(r.maxV)) + 2 * R + 10;
  for (let k = 0; k < directions; k += 1) {
    const a = (2 * Math.PI * k) / directions;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let lo = 0;
    let hi = span;
    const moved = (t: number): Rect => ({
      minU: r.minU + dx * t,
      maxU: r.maxU + dx * t,
      minV: r.minV + dy * t,
      maxV: r.maxV + dy * t,
    });
    if (interiorsOverlap(R, moved(hi))) continue;
    for (let i = 0; i < 60; i += 1) {
      const mid = (lo + hi) / 2;
      if (interiorsOverlap(R, moved(mid))) lo = mid;
      else hi = mid;
    }
    best = Math.min(best, hi);
  }
  return best;
}

/** Signed separation oracle: distance when disjoint, minus penetration depth when overlapping. */
export function oracleSignedSeparation(R: number, r: Rect): number {
  return interiorsOverlap(R, r) ? -searchedPenetrationDepth(R, r) : sampledDistance(R, r);
}
