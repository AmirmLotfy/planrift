/**
 * Interpolation helpers for the white model. Pure functions (no React, no three.js) so the
 * scroll story and the scene share one definition of "eased".
 */

export const clamp01 = (value: number): number => (value < 0 ? 0 : value > 1 ? 1 : value);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Hermite smoothstep of a progress value (clamped to 0..1). */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Progress of `value` inside [from, to], clamped to 0..1. */
export function progress(value: number, from: number, to: number): number {
  return to === from ? (value >= to ? 1 : 0) : clamp01((value - from) / (to - from));
}

/** CSS `cubic-bezier(x1, y1, x2, y2)` as a function of linear progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= (sampleX(t) - x) / slope;
    }
    if (!(t >= 0 && t <= 1) || Math.abs(sampleX(t) - x) > 1e-4) {
      let lo = 0;
      let hi = 1;
      t = x;
      for (let i = 0; i < 30; i += 1) {
        const v = sampleX(t);
        if (Math.abs(v - x) < 1e-6) break;
        if (v < x) lo = t;
        else hi = t;
        t = (lo + hi) / 2;
      }
    }
    return sampleY(t);
  };
}

/** The DESIGN.md motion curve, cubic-bezier(.16, 1, .3, 1). */
export const easeOut = cubicBezier(0.16, 1, 0.3, 1);
