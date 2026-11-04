'use client';

import { useCallback, useSyncExternalStore } from 'react';

/** Breakpoints shared with the CSS modules (mobile < 820 ≤ tablet < 1200 ≤ desktop). */
export const MOBILE_QUERY = '(max-width: 819.98px)';
export const DESKTOP_QUERY = '(min-width: 1200px)';
/** Desktop widths where the layers rail starts expanded. */
export const WIDE_DESKTOP_QUERY = '(min-width: 1360px)';

/**
 * Media query read through useSyncExternalStore. Layout itself is CSS-driven, so the server
 * value only affects ARIA wiring for one frame, never what is painted.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export function matches(query: string): boolean {
  return typeof window !== 'undefined' && window.matchMedia(query).matches;
}
