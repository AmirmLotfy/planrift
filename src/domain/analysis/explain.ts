/**
 * Plain-language explanations derived from computed results. Wording states what was
 * measured, never that a design is compliant, approved, or safe to build.
 */

import { localToPlan, type Vec } from '../geometry/frame';
import { formatAreaM2, formatDeg, formatMeasure, formatMm } from '../format';
import { footprintBounds, locateElement } from '../model/lookup';
import type { Furniture, Scene } from '../model/types';
import type { DoorAnalysis, PairAnalysis, PairStatus } from './analyze';

export const STATUS_LABEL: Record<PairStatus | 'REVIEW_REQUIRED', string> = {
  PASS: 'Pass',
  NEAR_CLEARANCE: 'Near clearance',
  CONTACT_REVIEW: 'Contact — review',
  CONFLICT: 'Conflict',
  INVALID: 'Invalid',
  UNSUPPORTED: 'Unsupported',
  REVIEW_REQUIRED: 'Review required',
};

export interface Explanation {
  readonly headline: string;
  readonly details: readonly string[];
  readonly action: string | null;
}

function furnitureLabel(scene: Scene, id: string): string {
  const found = locateElement(scene, id);
  return found && found.kind === 'furniture' ? `${(found.element as Furniture).name} ${id}` : id;
}

/** Names the corner or face of a footprint that a plan point lies on. */
function featureName(item: Furniture, p: Vec): string {
  const b = footprintBounds(item);
  const eps = 1e-6;
  const ns = Math.abs(p.y - b.minY) < eps ? 'south' : Math.abs(p.y - b.maxY) < eps ? 'north' : '';
  const ew = Math.abs(p.x - b.minX) < eps ? 'west' : Math.abs(p.x - b.maxX) < eps ? 'east' : '';
  if (ns && ew) return `${ns}-${ew} corner`;
  if (ns || ew) return `${ns || ew} face`;
  return 'nearest edge';
}

export function explainPair(scene: Scene, door: DoorAnalysis, pair: PairAnalysis): Explanation {
  const itemLabel = furnitureLabel(scene, pair.furnitureId);
  const found = locateElement(scene, pair.furnitureId);
  const item = found?.kind === 'furniture' ? (found.element as Furniture) : undefined;
  if (pair.status === 'INVALID' || pair.status === 'UNSUPPORTED' || !pair.separation || !door.frame || !item) {
    return {
      headline: `${pair.doorId} × ${pair.furnitureId}: not evaluated`,
      details: [pair.notEvaluatedReason ?? 'This pair was not evaluated.'],
      action: pair.status === 'INVALID' ? 'Correct the invalid configuration to evaluate clearance.' : 'Verify this condition manually.',
    };
  }
  const s = pair.separation;
  const R = door.radiusMm;
  const witnessPlan = localToPlan(door.frame, s.rectPoint);
  const feature = featureName(item, witnessPlan);
  const radialDistance = Math.hypot(s.rectPoint.x, s.rectPoint.y);
  switch (pair.status) {
    case 'CONFLICT': {
      const details: string[] = [];
      if (s.mode === 'radial') {
        details.push(`The ${feature} of ${pair.furnitureId} is ${formatMeasure(radialDistance)} from the hinge, inside the ${formatMm(R)} leaf.`);
      }
      details.push(`Intrusion depth ${formatMeasure(-s.valueMm)}: ${pair.furnitureId} would have to move at least this far to clear the swing.`);
      if (pair.overlapAreaMm2) details.push(`Overlap footprint ${formatAreaM2(pair.overlapAreaMm2)}.`);
      const strike = pair.strike;
      const headline = strike
        ? strike.firstDeg < 0.05
          ? `${pair.doorId} cannot open: ${itemLabel} blocks the leaf at the closed position.`
          : `${pair.doorId} strikes ${itemLabel} after opening ${formatDeg(strike.firstDeg)} of 90°.`
        : `${pair.doorId} intersects ${itemLabel} during its inward opening sweep.`;
      if (strike) {
        const strikePlan = localToPlan(door.frame, strike.firstPoint);
        details.unshift(`Door ${pair.doorId} intersects ${itemLabel} during its inward opening sweep. First contact is on the ${featureName(item, strikePlan)}.`);
      }
      return { headline, details, action: 'Review the proposed hinge position or the furniture location.' };
    }
    case 'CONTACT_REVIEW':
      return {
        headline: `${pair.doorId} touches ${itemLabel} within the ±${scene.settings.contactToleranceMm} mm contact tolerance.`,
        details: [
          `Measured separation ${formatMeasure(s.valueMm)} at the ${feature}. Tangency is reported for review, not as a conflict.`,
        ],
        action: 'Confirm the dimension on the drawings; real hardware, skirting or tolerances may close this gap.',
      };
    case 'NEAR_CLEARANCE':
      return {
        headline: `${pair.doorId} clears ${itemLabel} by ${formatMeasure(s.valueMm)}, below the ${formatMm(scene.settings.nearClearanceMm)} advisory threshold.`,
        details: [`Closest approach is at the ${feature} of ${pair.furnitureId}.`],
        action: 'Advisory only: check handles, door stops and circulation around this item.',
      };
    case 'PASS':
      return {
        headline: `${pair.doorId} clears ${itemLabel} through the full 90° swing.`,
        details: [`Minimum clearance ${formatMeasure(s.valueMm)} at the ${feature} of ${pair.furnitureId}.`],
        action: null,
      };
  }
}

export function explainDoor(door: DoorAnalysis, conflicts: number): string {
  if (door.validity === 'INVALID') return `${door.doorId} is invalid: ${door.issues.find((i) => i.severity === 'INVALID')?.message ?? ''}`;
  if (door.validity === 'UNSUPPORTED') return `${door.doorId} is outside the supported model: ${door.issues[0]?.message ?? ''}`;
  if (door.maxOpeningDeg !== null && door.maxOpeningDeg < 90 && door.limitingFurnitureId) {
    return `${door.doorId} can open ${formatDeg(door.maxOpeningDeg)} before striking ${door.limitingFurnitureId}${conflicts > 1 ? ` (${conflicts} conflicts)` : ''}.`;
  }
  return `${door.doorId} opens the full 90° without striking furniture.`;
}
