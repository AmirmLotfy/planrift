/**
 * Scene colours, all derived from src/render/palette.ts (DESIGN.md v4). Each hue keeps its one
 * meaning: grip blue for the draggable door only, redline for conflict only, amber for
 * near-clearance / contact advisories only.
 */

import { Color } from 'three';
import type { PairStatus } from '@/domain/analysis/analyze';
import { palette } from '@/render/palette';

export const tone = {
  model: palette.model,
  furniture: palette.model2,
  ink: palette.ink,
  inkSoft: palette.inkSoft,
  mineral: palette.mineral,
  grip: palette.blueprint,
  redline: palette.coral,
  redlineInk: palette.coralInk,
  amber: palette.copper,
  paper: palette.paper,
} as const;

/** Linear-space mix of two palette colours. */
export function mixTone(a: string, b: string, t: number): Color {
  return new Color(a).lerp(new Color(b), t);
}

export const isConflict = (status: PairStatus) => status === 'CONFLICT' || status === 'INVALID';
export const isAdvisory = (status: PairStatus) => status === 'CONTACT_REVIEW' || status === 'NEAR_CLEARANCE';

/** Furniture body colour: one step darker than the walls; struck items take the red pen. */
export function furnitureTone(status: PairStatus): Color {
  if (isConflict(status)) return mixTone(palette.model2, palette.coral, 0.62);
  if (isAdvisory(status)) return mixTone(palette.model2, palette.copper, 0.34);
  return new Color(palette.model2);
}

export interface SweepTone {
  readonly fill: string;
  readonly opacity: number;
  readonly arc: string;
}

/** Swing sector: grip blue 12 % while clear, amber for contact, redline 22 % when clashing. */
export function sweepTone(status: PairStatus): SweepTone {
  if (isConflict(status)) return { fill: palette.coral, opacity: 0.22, arc: palette.coral };
  if (status === 'CONTACT_REVIEW') return { fill: palette.copper, opacity: 0.2, arc: palette.copper };
  if (status === 'NEAR_CLEARANCE') return { fill: palette.blueprint, opacity: 0.12, arc: palette.copper };
  return { fill: palette.blueprint, opacity: 0.12, arc: palette.blueprint };
}
