/**
 * Pure helpers for direct manipulation. Pointer positions arrive in global plan mm; the door
 * can only slide along its host wall, so a drag is a projection onto the wall line.
 */

import type { Vec } from '@/domain/geometry/frame';
import type { PlanDoor } from './planModel';

/** Distance along the wall (from its start) of a global plan point. */
export function offsetAlongWall(door: Pick<PlanDoor, 'wallStart' | 'tangent'>, p: Vec): number {
  return (p.x - door.wallStart.x) * door.tangent.x + (p.y - door.wallStart.y) * door.tangent.y;
}

export function clampHinge(door: Pick<PlanDoor, 'dragRange'>, offset: number): number {
  const [lo, hi] = door.dragRange;
  return Math.min(hi, Math.max(lo, offset));
}

export function snap(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Hinge offset for a drag: the pointer's position along the wall minus where on the door the
 * drag started (so the door does not jump), snapped and clamped to positions where the leaf fits.
 */
export function dragHingeOffset(
  door: Pick<PlanDoor, 'wallStart' | 'tangent' | 'dragRange'>,
  pointer: Vec,
  grabDeltaMm: number,
  stepMm: number,
): number {
  return clampHinge(door, snap(offsetAlongWall(door, pointer) - grabDeltaMm, stepMm));
}

/** Keyboard nudge step: 10 mm, Shift 100 mm, Alt/Option 1 mm. */
export function nudgeStep(event: { shiftKey: boolean; altKey: boolean }): number {
  if (event.altKey) return 1;
  if (event.shiftKey) return 100;
  return 10;
}
