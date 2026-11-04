'use client';

import { useEffect, useRef, useState } from 'react';

/** Observed content-box size of an element (falls back to the given default before mount). */
export function useElementSize<T extends HTMLElement>(fallback: { width: number; height: number }) {
  const ref = useRef<T>(null);
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}
