'use client';

import { useMemo } from 'react';
import { STATUS_SEVERITY, type DoorAnalysis, type PairAnalysis } from '@/domain/analysis/analyze';
import { explainDoor, explainPair, type Explanation } from '@/domain/analysis/explain';
import { findDoor, locateElement } from '@/domain/model/lookup';
import type { Door, Room } from '@/domain/model/types';
import { useActiveView } from '@/state/hooks';
import { useWorkspace, type ActiveView } from '@/state/store';

/** The door under revision in the flagship scenario; used when no door is selected. */
export const DEFAULT_DOOR_ID = 'D-101';

/** Worst status first, then the smallest signed separation (the pair that governs the result). */
export function governingPair(pairs: readonly PairAnalysis[]): PairAnalysis | undefined {
  return [...pairs].sort((a, b) => {
    const d = STATUS_SEVERITY.indexOf(a.status) - STATUS_SEVERITY.indexOf(b.status);
    if (d !== 0) return d;
    return (a.separation?.valueMm ?? Infinity) - (b.separation?.valueMm ?? Infinity);
  })[0];
}

export interface DoorConsequence {
  readonly doorId: string;
  readonly room: Room;
  readonly door: Door;
  readonly analysis: DoorAnalysis;
  /** Every door × footprint pair tested for this door. */
  readonly pairs: readonly PairAnalysis[];
  readonly attention: readonly PairAnalysis[];
  readonly passing: readonly PairAnalysis[];
  readonly conflicts: number;
  /** Governing pair, optionally narrowed to one selected furniture item. */
  readonly governing: PairAnalysis | undefined;
  readonly explanation: Explanation | null;
  /** One computed sentence: the pair explanation for valid doors, the door explanation otherwise. */
  readonly headline: string;
}

/**
 * Reads the computed consequence of one door from the active view. Pure selection over the
 * analysis: no geometry is computed here.
 */
export function doorConsequence(view: ActiveView, doorId: string, focusFurnitureId?: string | null): DoorConsequence | null {
  const found = findDoor(view.scene, doorId);
  if (!found) return null;
  const roomAnalysis = view.analysis.rooms.find((r) => r.roomId === found.room.id);
  const analysis = roomAnalysis?.doors.find((d) => d.doorId === doorId);
  if (!roomAnalysis || !analysis) return null;
  const pairs = roomAnalysis.pairs.filter((p) => p.doorId === doorId);
  const focusPairs = focusFurnitureId ? pairs.filter((p) => p.furnitureId === focusFurnitureId) : pairs;
  const governing = governingPair(focusPairs.length ? focusPairs : pairs);
  const explanation = governing ? explainPair(view.scene, analysis, governing) : null;
  const conflicts = pairs.filter((p) => p.status === 'CONFLICT').length;
  return {
    doorId,
    room: found.room,
    door: found.door,
    analysis,
    pairs,
    attention: pairs.filter((p) => p.status !== 'PASS'),
    passing: pairs.filter((p) => p.status === 'PASS'),
    conflicts,
    governing,
    explanation,
    headline: analysis.validity === 'VALID' && explanation ? explanation.headline : explainDoor(analysis, conflicts),
  };
}

/** The door the canvas and inspector report on: the selected door, else D-101. */
export function useFocusDoorId(view: ActiveView): string {
  const selectedId = useWorkspace((s) => s.selectedId);
  return selectedId && findDoor(view.scene, selectedId) ? selectedId : DEFAULT_DOOR_ID;
}

/** Door-level consequence for the focus door (all pairs; used by the banner and status strip). */
export function useFocusConsequence(): { view: ActiveView; consequence: DoorConsequence | null } {
  const view = useActiveView();
  const doorId = useFocusDoorId(view);
  const consequence = useMemo(() => doorConsequence(view, doorId), [view, doorId]);
  return { view, consequence };
}

/** Consequence narrowed to the selected furniture item when one is selected (inspector Result). */
export function useResultConsequence(): { view: ActiveView; consequence: DoorConsequence | null } {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const doorId = useFocusDoorId(view);
  const furnitureId = selectedId && locateElement(view.scene, selectedId)?.kind === 'furniture' ? selectedId : null;
  const consequence = useMemo(() => doorConsequence(view, doorId, furnitureId), [view, doorId, furnitureId]);
  return { view, consequence };
}
