import { Easing } from 'remotion';

export const FPS = 30;
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.5, 0, 0.75, 0);

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress of t through [a, b], eased. */
export const prog = (t: number, a: number, b: number, e: (x: number) => number = easeOut) =>
  e(clamp01((t - a) / (b - a)));

export interface Key {
  readonly t: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Easing into this key from the previous one. */
  readonly e?: (x: number) => number;
}

/** Camera at time t (seconds on the final timeline) from keyframes; zoom interpolates in log space. */
export function camAt(t: number, keys: readonly Key[]): { x: number; y: number; z: number } {
  if (t <= keys[0]!.t) return keys[0]!;
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i]!;
    if (t <= b.t) {
      const a = keys[i - 1]!;
      const p = (b.e ?? easeInOut)(clamp01((t - a.t) / (b.t - a.t)));
      return {
        x: lerp(a.x, b.x, p),
        y: lerp(a.y, b.y, p),
        z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), p)),
      };
    }
  }
  return keys[keys.length - 1]!;
}

/** A short decaying shake (px) after time t0. */
export function shake(t: number, t0: number, amp = 6, dur = 0.35) {
  if (t < t0 || t > t0 + dur) return { x: 0, y: 0 };
  const k = 1 - (t - t0) / dur;
  return { x: Math.sin((t - t0) * 90) * amp * k * k, y: Math.cos((t - t0) * 77) * amp * 0.6 * k * k };
}
