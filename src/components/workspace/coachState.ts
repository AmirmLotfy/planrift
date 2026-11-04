'use client';

import { useSyncExternalStore } from 'react';

/**
 * First-run coach preferences, kept in this browser only. UI state, so it lives beside the
 * workspace components rather than in the project store.
 */
const KEY = 'planrift.coach.v1';

export interface CoachPrefs {
  readonly dismissed: boolean;
  /** The comparison has been opened at least once (the store only knows the current view). */
  readonly compared: boolean;
}

/** Hidden on the server and during hydration, so a dismissed coach never flashes on reload. */
const SERVER: CoachPrefs = { dismissed: true, compared: false };
let current: CoachPrefs | null = null;
const listeners = new Set<() => void>();

function read(): CoachPrefs {
  if (current) return current;
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? 'null');
    const record = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    current = { dismissed: record.dismissed === true, compared: record.compared === true };
  } catch {
    current = { dismissed: false, compared: false };
  }
  return current;
}

function write(next: CoachPrefs): void {
  current = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); the preference then lasts for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCoachPrefs(): CoachPrefs {
  return useSyncExternalStore(subscribe, read, () => SERVER);
}

export function updateCoachPrefs(patch: Partial<CoachPrefs>): void {
  const prev = read();
  const next = { ...prev, ...patch };
  if (next.dismissed !== prev.dismissed || next.compared !== prev.compared) write(next);
}
