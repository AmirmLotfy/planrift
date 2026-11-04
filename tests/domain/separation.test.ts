import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { makeDoorFrame, rectToLocal } from '@/domain/geometry/frame';
import {
  classifySeparation,
  compareSeparation,
  signedSeparation,
  type ClearanceSettings,
} from '@/domain/geometry/separation';
import { overlapAreaMm2, overlapFootprint, polygonArea, strikeRange } from '@/domain/geometry/sweep';
import { interiorsOverlap, oracleSignedSeparation, segmentRectDistance } from './oracles';

const SETTINGS: ClearanceSettings = { contactToleranceMm: 1, nearClearanceMm: 100 };
const LEAF = 850;
const F07 = { minX: 3620, minY: 230, maxX: 4100, maxY: 650 };

/** D-101 on R-512's south wall (6000 x 4500), leaf extending east. */
function localConsole(hingeX: number) {
  return rectToLocal(makeDoorFrame('south', 6000, 4500, hingeX, 'toward-end'), F07);
}

describe('flagship hand-computed oracle (docs/geometry/GEOMETRY_CONTRACT.md §7)', () => {
  it('baseline hinge 1700: PASS, 1083.7 mm radial clearance to the south-west corner', () => {
    const rect = localConsole(1700);
    expect(rect).toEqual({ minU: 1920, maxU: 2400, minV: 230, maxV: 650 });
    const s = signedSeparation(LEAF, rect);
    expect(s.mode).toBe('radial');
    expect(s.valueMm).toBeCloseTo(Math.sqrt(3_739_300) - 850, 9);
    expect(s.valueMm).toBeCloseTo(1083.73, 2);
    expect(classifySeparation(LEAF, rect, SETTINGS)).toBe('PASS');
    expect(strikeRange(LEAF, rect)).toBeNull();
    expect(overlapAreaMm2(LEAF, rect)).toBe(0);
  });

  it('revision A hinge 3000: CONFLICT, 188.7 mm intrusion, strike at 15.70° on the south face', () => {
    const rect = localConsole(3000);
    expect(rect).toEqual({ minU: 620, maxU: 1100, minV: 230, maxV: 650 });
    const s = signedSeparation(LEAF, rect);
    expect(s.mode).toBe('radial');
    expect(s.valueMm).toBeCloseTo(Math.sqrt(437_300) - 850, 9);
    expect(s.valueMm).toBeCloseTo(-188.71, 2);
    expect(classifySeparation(LEAF, rect, SETTINGS)).toBe('CONFLICT');
    const strike = strikeRange(LEAF, rect);
    expect(strike).not.toBeNull();
    expect(strike!.firstDeg).toBeCloseTo((Math.asin(230 / 850) * 180) / Math.PI, 9);
    expect(strike!.firstDeg).toBeCloseTo(15.7, 1);
    // Strike point on the south face y = 230 at x = 3000 + sqrt(850^2 - 230^2) = 3818.3
    expect(3000 + strike!.firstPoint.x).toBeCloseTo(3818.29, 2);
    expect(strike!.firstPoint.y).toBe(230);
    expect(overlapAreaMm2(LEAF, rect)).toBeGreaterThan(41_300);
    expect(overlapAreaMm2(LEAF, rect)).toBeLessThan(41_500);
  });

  it('revision B hinge 2400: PASS, 391.5 mm clearance', () => {
    const rect = localConsole(2400);
    const s = signedSeparation(LEAF, rect);
    expect(s.valueMm).toBeCloseTo(Math.sqrt(1_541_300) - 850, 9);
    expect(s.valueMm).toBeCloseTo(391.49, 2);
    expect(classifySeparation(LEAF, rect, SETTINGS)).toBe('PASS');
  });

  it('hinge 4150: console sits behind the open leaf, NEAR_CLEARANCE at exactly 50 mm', () => {
    const rect = localConsole(4150);
    const s = signedSeparation(LEAF, rect);
    expect(s.mode).toBe('behind-open-leaf');
    expect(s.valueMm).toBe(50);
    expect(classifySeparation(LEAF, rect, SETTINGS)).toBe('NEAR_CLEARANCE');
  });

  it.each([
    [2698, 'PASS', 100.25],
    [2699, 'NEAR_CLEARANCE', 99.28],
    [2800, 'NEAR_CLEARANCE', 1.64],
    [2801, 'CONTACT_REVIEW', 0.68],
    [2802, 'CONTACT_REVIEW', -0.28],
    [2803, 'CONFLICT', -1.24],
    [4098, 'CONFLICT', -2],
    [4099, 'CONTACT_REVIEW', -1],
    [4100, 'CONTACT_REVIEW', 0],
    [4101, 'CONTACT_REVIEW', 1],
    [4102, 'NEAR_CLEARANCE', 2],
    [4199, 'NEAR_CLEARANCE', 99],
    [4200, 'PASS', 100],
  ] as const)('status band boundary at hinge %i mm is %s (s ≈ %d mm)', (x, status, approx) => {
    const rect = localConsole(x);
    expect(classifySeparation(LEAF, rect, SETTINGS)).toBe(status);
    expect(signedSeparation(LEAF, rect).valueMm).toBeCloseTo(approx, 1);
  });
});

describe('exact predicates', () => {
  it('detects exact tangency (s = 0) on a perfect-square radius', () => {
    // Corner at (510, 680): sqrt(510^2 + 680^2) = 850 exactly.
    const rect = { minU: 510, maxU: 900, minV: 680, maxV: 900 };
    expect(compareSeparation(850, rect, 0)).toBe(0);
    expect(signedSeparation(850, rect).valueMm).toBe(0);
    expect(classifySeparation(850, rect, SETTINGS)).toBe('CONTACT_REVIEW');
  });

  it('does not label tangency as deep penetration (contact tolerance ±1 mm)', () => {
    // Corner exactly 1 mm inside the arc: sqrt(504^2 + 672^2) = 840 -> s = -10 (too deep);
    // corner on a 849 radius: (849, 0) offsets.
    expect(classifySeparation(850, { minU: 849, maxU: 1000, minV: 0, maxV: 100 }, SETTINGS)).toBe('CONTACT_REVIEW');
    expect(classifySeparation(850, { minU: 848, maxU: 1000, minV: 0, maxV: 100 }, SETTINGS)).toBe('CONFLICT');
    expect(classifySeparation(850, { minU: 851, maxU: 1000, minV: 0, maxV: 100 }, SETTINGS)).toBe('CONTACT_REVIEW');
    expect(classifySeparation(850, { minU: 852, maxU: 1000, minV: 0, maxV: 100 }, SETTINGS)).toBe('NEAR_CLEARANCE');
  });

  it('reports NEAR_CLEARANCE 50 mm beyond the boundary with a 100 mm threshold, PASS at 100 mm', () => {
    expect(classifySeparation(850, { minU: 900, maxU: 1200, minV: 0, maxV: 300 }, SETTINGS)).toBe('NEAR_CLEARANCE');
    expect(classifySeparation(850, { minU: 950, maxU: 1200, minV: 0, maxV: 300 }, SETTINGS)).toBe('PASS');
  });

  it('rejects non-integer, non-finite and malformed input instead of guessing', () => {
    expect(() => signedSeparation(850, { minU: 0.5, maxU: 10, minV: 0, maxV: 10 })).toThrow(RangeError);
    expect(() => signedSeparation(850, { minU: Number.NaN, maxU: 10, minV: 0, maxV: 10 })).toThrow(RangeError);
    expect(() => signedSeparation(Infinity, { minU: 0, maxU: 10, minV: 0, maxV: 10 })).toThrow(RangeError);
    expect(() => signedSeparation(850, { minU: 20, maxU: 10, minV: 0, maxV: 10 })).toThrow(RangeError);
    expect(() => signedSeparation(0, { minU: 0, maxU: 10, minV: 0, maxV: 10 })).toThrow(RangeError);
    expect(() => classifySeparation(850, { minU: 0, maxU: 10, minV: 0, maxV: 10 }, { contactToleranceMm: 5, nearClearanceMm: 5 })).toThrow(RangeError);
  });
});

const coord = fc.integer({ min: -2500, max: 3500 });
const size = fc.integer({ min: 1, max: 1500 });
const radius = fc.integer({ min: 300, max: 1500 });
const rectArb = fc.tuple(coord, coord, size, size).map(([u, v, w, h]) => ({ minU: u, maxU: u + w, minV: v, maxV: v + h }));

describe('independent oracle agreement (property-based)', () => {
  it('signed separation matches boundary sampling / translation search within 0.05 mm', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        const s = signedSeparation(R, rect).valueMm;
        const oracle = oracleSignedSeparation(R, rect);
        expect(Math.abs(s - oracle)).toBeLessThan(0.05);
      }),
      { numRuns: 300 },
    );
  });

  it('negative separation exactly when interiors overlap', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        const overlaps = interiorsOverlap(R, rect);
        const sign = compareSeparation(R, rect, 0);
        expect(sign < 0).toBe(overlaps);
      }),
      { numRuns: 2000 },
    );
  });

  it('exact classification agrees with the float value away from thresholds', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        const s = signedSeparation(R, rect).valueMm;
        const status = classifySeparation(R, rect, SETTINGS);
        const expected = s < -1 ? 'CONFLICT' : s <= 1 ? 'CONTACT_REVIEW' : s < 100 ? 'NEAR_CLEARANCE' : 'PASS';
        expect(status).toBe(expected);
      }),
      { numRuns: 3000 },
    );
  });

  it('is 1-Lipschitz under furniture translation', () => {
    fc.assert(
      fc.property(radius, rectArb, fc.integer({ min: -300, max: 300 }), fc.integer({ min: -300, max: 300 }), (R, rect, du, dv) => {
        const moved = { minU: rect.minU + du, maxU: rect.maxU + du, minV: rect.minV + dv, maxV: rect.maxV + dv };
        const delta = Math.abs(signedSeparation(R, moved).valueMm - signedSeparation(R, rect).valueMm);
        expect(delta).toBeLessThanOrEqual(Math.hypot(du, dv) + 1e-9);
      }),
      { numRuns: 1000 },
    );
  });

  it('is deterministic: the same input always yields the same result', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        expect(signedSeparation(R, { ...rect })).toEqual(signedSeparation(R, rect));
      }),
      { numRuns: 300 },
    );
  });
});

describe('sweep measurements', () => {
  it('closed-form overlap area matches the shoelace area of the sampled footprint', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        const area = overlapAreaMm2(R, rect);
        const polygon = overlapFootprint(R, rect, 2048);
        if (area < 1) {
          expect(polygonArea(polygon)).toBeLessThan(2);
          return;
        }
        expect(Math.abs(polygonArea(polygon) - area) / area).toBeLessThan(0.002);
      }),
      { numRuns: 500 },
    );
  });

  it('overlap area is positive exactly when interiors overlap', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        expect(overlapAreaMm2(R, rect) > 0).toBe(interiorsOverlap(R, rect));
      }),
      { numRuns: 2000 },
    );
  });

  it('the leaf at the first-strike angle touches the rectangle and stays clear just before it', () => {
    fc.assert(
      fc.property(radius, rectArb, (R, rect) => {
        const strike = strikeRange(R, rect);
        if (!strike || strike.firstDeg < 0.01) return;
        const leafGap = (deg: number) => {
          const a = (deg * Math.PI) / 180;
          return segmentRectDistance({ x: 0, y: 0 }, { x: R * Math.cos(a), y: R * Math.sin(a) }, rect);
        };
        expect(leafGap(strike.firstDeg)).toBeLessThan(1e-6);
        expect(leafGap(strike.firstDeg - 0.01)).toBeGreaterThan(0);
      }),
      { numRuns: 300 },
    );
  });
});
