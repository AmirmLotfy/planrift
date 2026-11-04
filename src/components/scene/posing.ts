/**
 * Camera poses for the white model. Each pose is a viewing direction (elevation, and azimuth
 * relative to the door's wall) plus a set of world points to keep in view; the distance and
 * target are fitted to those points for the current canvas aspect and the frame box the
 * subject must stay inside (so overlaid text never covers the model). Pure math, no three.js.
 */

import type { StudyModel, V3 } from './studyModel';

export type CameraPose = 'hero' | 'door' | 'plan' | 'overview';

/** Region of the canvas (fractions 0..1, top-left origin) the subject is framed into. */
export interface FrameBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export const FULL_FRAME: FrameBox = { left: 0, right: 1, top: 0, bottom: 1 };

/** viewOffsetX (-1..1) as a frame box: the subject centre moves by that fraction of the half-width. */
export function frameFromOffsetX(offset: number): FrameBox {
  const v = Math.max(-0.9, Math.min(0.9, offset));
  return v >= 0 ? { left: v, right: 1, top: 0, bottom: 1 } : { left: 0, right: 1 + v, top: 0, bottom: 1 };
}

export interface CameraGoal {
  readonly target: V3;
  /** World azimuth of the camera offset from the target: atan2(x, z). */
  readonly azimuth: number;
  readonly elevation: number;
  readonly distance: number;
  /** Vertical field of view, degrees. */
  readonly fov: number;
  /** Principal point in NDC (subject centre on screen). */
  readonly cx: number;
  readonly cy: number;
}

interface PoseDef {
  /** Azimuth from the wall's inward normal toward the hinge side, degrees. */
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly fov: number;
  /** Fraction of the frame box the subject fills. */
  readonly fill: number;
  readonly points: (model: StudyModel) => readonly V3[];
}

// Viewpoints sit on the room side of the door's wall: from outside, the 1,350 mm cut wall hides
// the console 230 mm behind it at any reasonable elevation.
const POSES: Record<CameraPose, PoseDef> = {
  hero: { azimuthDeg: 33, elevationDeg: 41, fov: 30, fill: 0.97, points: (m) => m.framing.room },
  door: { azimuthDeg: 24, elevationDeg: 37, fov: 30, fill: 0.8, points: (m) => m.framing.door },
  plan: { azimuthDeg: 0, elevationDeg: 89.9, fov: 20, fill: 0.92, points: (m) => m.framing.plan },
  overview: { azimuthDeg: 38, elevationDeg: 57, fov: 30, fill: 0.86, points: (m) => m.framing.room },
};

const RAD = Math.PI / 180;

type Vec3 = [number, number, number];
const sub = (a: V3, b: V3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Unit vector from the target toward the camera. */
export function backVector(azimuth: number, elevation: number): Vec3 {
  return [Math.sin(azimuth) * Math.cos(elevation), Math.sin(elevation), Math.cos(azimuth) * Math.cos(elevation)];
}

/** Camera right / up vectors matching three.js lookAt with world up (0, 1, 0). */
export function cameraBasis(azimuth: number, elevation: number): { back: Vec3; right: Vec3; up: Vec3 } {
  const back = backVector(azimuth, elevation);
  const right = norm([back[2], 0, -back[0]]);
  return { back, right, up: cross(back, right) };
}

export function poseAzimuth(model: StudyModel, azimuthDeg: number): number {
  const a = azimuthDeg * RAD;
  const x = model.inward[0] * Math.cos(a) - model.along[0] * Math.sin(a);
  const z = model.inward[1] * Math.cos(a) - model.along[1] * Math.sin(a);
  return Math.atan2(x, z);
}

/**
 * Fits a pose: finds the target and distance at which every framing point projects inside the
 * frame box (scaled by the pose's fill), centred on the box.
 */
export function fitPose(model: StudyModel, pose: CameraPose, aspect: number, frame: FrameBox): CameraGoal {
  const def = POSES[pose];
  const points = def.points(model);
  const azimuth = poseAzimuth(model, def.azimuthDeg);
  const elevation = def.elevationDeg * RAD;
  const { back, right, up } = cameraBasis(azimuth, elevation);
  const cx = frame.left + frame.right - 1;
  const cy = 1 - (frame.top + frame.bottom);
  const hx = Math.max(0.05, (frame.right - frame.left) * def.fill);
  const hy = Math.max(0.05, (frame.bottom - frame.top) * def.fill);
  const tanV = Math.tan((def.fov * RAD) / 2);
  const tanH = tanV * (Number.isFinite(aspect) && aspect > 0 ? aspect : 1);

  let target: Vec3 = [0, 0, 0];
  for (const p of points) target = [target[0] + p[0] / points.length, target[1] + p[1] / points.length, target[2] + p[2] / points.length];
  const distanceFor = (t: V3) => {
    let d = 0;
    for (const p of points) {
      const v = sub(p, t);
      const f = dot(v, back);
      d = Math.max(d, f + Math.abs(dot(v, right)) / (tanH * hx), f + Math.abs(dot(v, up)) / (tanV * hy));
    }
    return d;
  };
  let distance = distanceFor(target);
  for (let i = 0; i < 6; i += 1) {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    for (const p of points) {
      const v = sub(p, target);
      const depth = Math.max(1e-3, distance - dot(v, back));
      const x = dot(v, right) / (depth * tanH);
      const y = dot(v, up) / (depth * tanV);
      xMin = Math.min(xMin, x);
      xMax = Math.max(xMax, x);
      yMin = Math.min(yMin, y);
      yMax = Math.max(yMax, y);
    }
    const sx = ((xMin + xMax) / 2) * distance * tanH;
    const sy = ((yMin + yMax) / 2) * distance * tanV;
    target = [target[0] + right[0] * sx + up[0] * sy, target[1] + right[1] * sx + up[1] * sy, target[2] + right[2] * sx + up[2] * sy];
    distance = distanceFor(target);
  }
  return { target, azimuth, elevation, distance, fov: def.fov, cx, cy };
}

/** Shortest signed angular difference b - a. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function blendGoals(a: CameraGoal, b: CameraGoal, t: number): CameraGoal {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    target: [mix(a.target[0], b.target[0]), mix(a.target[1], b.target[1]), mix(a.target[2], b.target[2])],
    azimuth: a.azimuth + angleDelta(a.azimuth, b.azimuth) * t,
    elevation: mix(a.elevation, b.elevation),
    distance: a.distance * Math.pow(b.distance / a.distance, t),
    fov: mix(a.fov, b.fov),
    cx: mix(a.cx, b.cx),
    cy: mix(a.cy, b.cy),
  };
}
