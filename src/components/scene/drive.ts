/**
 * External driver for the white model's camera and morph. Scroll handlers write here at frame
 * rate without re-rendering React; the scene reads it inside useFrame and invalidates the
 * on-demand render loop when it changes.
 */

import { FULL_FRAME, type CameraPose, type FrameBox } from './posing';

export interface DriveState {
  /** Pose blended from… */
  readonly from: CameraPose;
  /** …toward this pose, by t (0..1, already eased by the caller). */
  readonly to: CameraPose;
  readonly t: number;
  /** 0 = lit white model, 1 = line drawing (flat, walls in poché, no shadows). */
  readonly morph: number;
  /** Region of the canvas the subject is framed into. */
  readonly frame: FrameBox;
  /** Opacity of the measured labels drawn over the model (0..1). */
  readonly labels: number;
}

export interface SceneDrive {
  get(): DriveState;
  set(patch: Partial<DriveState>): void;
  subscribe(listener: () => void): () => void;
}

const sameFrame = (a: FrameBox, b: FrameBox) => a.left === b.left && a.right === b.right && a.top === b.top && a.bottom === b.bottom;

export function createDrive(initial: Partial<DriveState> = {}): SceneDrive {
  let state: DriveState = { from: 'hero', to: 'hero', t: 0, morph: 0, frame: FULL_FRAME, labels: 1, ...initial };
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      const next = { ...state, ...patch };
      if (
        next.from === state.from &&
        next.to === state.to &&
        next.t === state.t &&
        next.morph === state.morph &&
        next.labels === state.labels &&
        sameFrame(next.frame, state.frame)
      ) {
        return;
      }
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
