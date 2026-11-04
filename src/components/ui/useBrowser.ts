'use client';

import { useSyncExternalStore } from 'react';

/**
 * Browser capabilities read through useSyncExternalStore: no setState-in-effect, no hydration
 * mismatch (the server snapshot is used for the first client render, then React re-renders).
 */

const REDUCED = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED).matches,
    () => false,
  );
}

let webglSupport: boolean | undefined;

function detectWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement('canvas');
      webglSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const noSubscribe = () => () => {};

/** null during SSR and the first hydration render, then the detected value. */
export function useWebGLSupport(): boolean | null {
  return useSyncExternalStore<boolean | null>(noSubscribe, detectWebGL, () => null);
}
