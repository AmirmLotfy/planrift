/**
 * Coordinate frames for PLANRIFT geometry.
 *
 * Room-local plan coordinates: origin at the room's south-west interior corner,
 * +x east, +y north, integer millimetres. See docs/geometry/GEOMETRY_CONTRACT.md.
 *
 * A door frame maps room-local coordinates into the door's canonical frame, where the
 * hinge is the origin, the closed leaf lies along +u and the leaf swings toward +v.
 * The axes are axis-aligned unit vectors with integer components, so the mapping is
 * exact on integer inputs (a rotation or a reflection, never a scaling).
 */

export type WallSide = 'south' | 'east' | 'north' | 'west';
export type LeafDirection = 'toward-end' | 'toward-start';

export interface Vec {
  readonly x: number;
  readonly y: number;
}

/** Closed axis-aligned rectangle in room-local plan coordinates. */
export interface PlanRect {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Closed axis-aligned rectangle in a door's local (u, v) frame. */
export interface LocalRect {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
}

export interface WallSegment {
  readonly side: WallSide;
  readonly start: Vec;
  readonly end: Vec;
  /** Unit direction from start to end. */
  readonly t: Vec;
  /** Unit normal pointing into the room interior. */
  readonly n: Vec;
  readonly length: number;
}

export interface DoorFrame {
  readonly hinge: Vec;
  readonly u: Vec;
  readonly v: Vec;
}

/** Avoids -0 leaking into results (0 * -1 === -0 in IEEE-754). */
const z = (value: number): number => (value === 0 ? 0 : value);

/**
 * Wall segments run counter-clockwise around the interior so the interior is on the left.
 */
export function wallSegment(side: WallSide, width: number, depth: number): WallSegment {
  switch (side) {
    case 'south':
      return { side, start: { x: 0, y: 0 }, end: { x: width, y: 0 }, t: { x: 1, y: 0 }, n: { x: 0, y: 1 }, length: width };
    case 'east':
      return { side, start: { x: width, y: 0 }, end: { x: width, y: depth }, t: { x: 0, y: 1 }, n: { x: -1, y: 0 }, length: depth };
    case 'north':
      return { side, start: { x: width, y: depth }, end: { x: 0, y: depth }, t: { x: -1, y: 0 }, n: { x: 0, y: -1 }, length: width };
    case 'west':
      return { side, start: { x: 0, y: depth }, end: { x: 0, y: 0 }, t: { x: 0, y: -1 }, n: { x: 1, y: 0 }, length: depth };
  }
}

/** Room dimension perpendicular to a wall (how far a swing can reach before the opposite wall). */
export function roomDepthFromWall(side: WallSide, width: number, depth: number): number {
  return side === 'south' || side === 'north' ? depth : width;
}

export function pointOnWall(segment: WallSegment, offset: number): Vec {
  return {
    x: z(segment.start.x + offset * segment.t.x),
    y: z(segment.start.y + offset * segment.t.y),
  };
}

export function makeDoorFrame(
  side: WallSide,
  width: number,
  depth: number,
  hingeOffset: number,
  leafDirection: LeafDirection,
): DoorFrame {
  const segment = wallSegment(side, width, depth);
  const hinge = pointOnWall(segment, hingeOffset);
  const sign = leafDirection === 'toward-end' ? 1 : -1;
  return {
    hinge,
    u: { x: z(segment.t.x * sign), y: z(segment.t.y * sign) },
    v: segment.n,
  };
}

export function planToLocal(frame: DoorFrame, p: Vec): Vec {
  const dx = p.x - frame.hinge.x;
  const dy = p.y - frame.hinge.y;
  return {
    x: z(dx * frame.u.x + dy * frame.u.y),
    y: z(dx * frame.v.x + dy * frame.v.y),
  };
}

export function localToPlan(frame: DoorFrame, q: Vec): Vec {
  return {
    x: z(frame.hinge.x + q.x * frame.u.x + q.y * frame.v.x),
    y: z(frame.hinge.y + q.x * frame.u.y + q.y * frame.v.y),
  };
}

/** Exact on integer input: the four corners map to integer corners of an axis-aligned rectangle. */
export function rectToLocal(frame: DoorFrame, rect: PlanRect): LocalRect {
  const corners = [
    planToLocal(frame, { x: rect.minX, y: rect.minY }),
    planToLocal(frame, { x: rect.maxX, y: rect.minY }),
    planToLocal(frame, { x: rect.maxX, y: rect.maxY }),
    planToLocal(frame, { x: rect.minX, y: rect.maxY }),
  ];
  const us = corners.map((c) => c.x);
  const vs = corners.map((c) => c.y);
  return {
    minU: Math.min(...us),
    maxU: Math.max(...us),
    minV: Math.min(...vs),
    maxV: Math.max(...vs),
  };
}
