import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { analyzeScene, doorAnalysis, type PairStatus } from '@/domain/analysis/analyze';
import { computeHingeMap } from '@/domain/analysis/hingeMap';
import { footprintBounds } from '@/domain/model/lookup';
import type { Scene } from '@/domain/model/types';
import { createAsterHouseScene } from '@/domain/seed/asterHouse';
import { buildCutawayModel } from '@/render/cutawayModel';
import { buildPlanModel } from '@/render/planModel';
import { planToSvg, planToWorld, svgToPlan, worldToPlan } from '@/render/transforms';

function withHinge(offset: number): Scene {
  const scene = createAsterHouseScene();
  scene.rooms[0]!.doors[0]!.hingeOffsetMm = offset;
  return scene;
}

const ORDER: PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED', 'CONTACT_REVIEW', 'NEAR_CLEARANCE', 'PASS'];

describe('transforms', () => {
  it('plan ↔ SVG and plan ↔ world are exact inverses', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100_000, max: 100_000 }), fc.integer({ min: -100_000, max: 100_000 }), (x, y) => {
        expect(svgToPlan(planToSvg({ x, y }))).toEqual({ x, y });
        const back = worldToPlan(planToWorld({ x, y }, 750));
        expect(back.plan.x).toBeCloseTo(x, 9);
        expect(back.plan.y).toBeCloseTo(y, 9);
        expect(back.heightMm).toBeCloseTo(750, 9);
      }),
    );
  });

  it('plan north (+y) maps to three.js −z and SVG −y', () => {
    expect(planToWorld({ x: 0, y: 1000 })).toEqual([0, 0, -1]);
    expect(planToSvg({ x: 0, y: 1000 })).toEqual({ x: 0, y: -1000 });
  });
});

describe('2D and 3D render models agree with the canonical scene', () => {
  it('for any hinge offset, door hinge, leaf angle, furniture positions and statuses agree', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5150 }), (offset) => {
        const scene = withHinge(offset);
        const analysis = analyzeScene(scene);
        const plan = buildPlanModel(scene, analysis);
        const cut = buildCutawayModel(scene, analysis, 'R-512');
        const room = scene.rooms[0]!;
        const planDoor = plan.rooms[0]!.doors[0]!;
        const cutDoor = cut.doors.find((d) => d.doorId === 'D-101')!;
        const da = doorAnalysis(analysis, 'D-101')!;

        // Hinge: canonical (offset, 0) in R-512, origin (0, 0).
        expect(planDoor.hinge).toEqual({ x: offset, y: 0 });
        const cutHinge = worldToPlan(cutDoor.hinge).plan;
        expect(Math.abs(cutHinge.x - offset)).toBeLessThan(0.5);
        expect(Math.abs(cutHinge.y)).toBeLessThan(0.5);

        // Leaf angle comes from the analysis in both views.
        expect(planDoor.leafAngleDeg).toBe(da.maxOpeningDeg);
        expect(cutDoor.openingDeg).toBe(da.maxOpeningDeg);

        // Furniture footprints and statuses.
        for (const item of room.furniture) {
          const b = footprintBounds(item);
          const pf = plan.rooms[0]!.furniture.find((f) => f.furnitureId === item.id)!;
          const xs = pf.polygon.map((p) => p.x);
          const ys = pf.polygon.map((p) => p.y);
          expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]).toEqual([b.minX, b.minY, b.maxX, b.maxY]);
          const cb = cut.boxes.find((x) => x.elementId === item.id)!;
          const centre = worldToPlan(cb.center);
          expect(Math.abs(centre.plan.x - (b.minX + b.maxX) / 2)).toBeLessThan(0.5);
          expect(Math.abs(centre.plan.y - (b.minY + b.maxY) / 2)).toBeLessThan(0.5);
          expect(Math.abs(cb.size[0] * 1000 - (b.maxX - b.minX))).toBeLessThan(0.5);
          expect(Math.abs(cb.size[2] * 1000 - (b.maxY - b.minY))).toBeLessThan(0.5);
          expect(Math.abs(cb.size[1] * 1000 - item.heightMm)).toBeLessThan(0.5);
          const statuses = analysis.rooms[0]!.pairs.filter((p) => p.furnitureId === item.id).map((p) => p.status);
          const worst = statuses.reduce((w, s) => (ORDER.indexOf(s) < ORDER.indexOf(w) ? s : w), 'PASS' as PairStatus);
          expect(pf.status).toBe(worst);
          expect(cb.status).toBe(worst);
        }
      }),
      { numRuns: 60 },
    );
  });

  it('revision A draws the strike point on the console south face and a conflict footprint', () => {
    const scene = withHinge(3000);
    const plan = buildPlanModel(scene, analyzeScene(scene));
    const door = plan.rooms[0]!.doors[0]!;
    expect(door.strike!.furnitureId).toBe('F-07');
    expect(door.strike!.point.x).toBeCloseTo(3818.29, 2);
    expect(door.strike!.point.y).toBeCloseTo(230, 9);
    expect(door.footprints.map((f) => f.furnitureId)).toEqual(['F-07']);
    expect(door.ghostLeaf).not.toBeNull();
    expect(door.intrusion!.valueMm).toBeCloseTo(-188.71, 2);
  });

  it('revision B draws the governing clearance to the console corner', () => {
    const scene = withHinge(2400);
    const plan = buildPlanModel(scene, analyzeScene(scene));
    const door = plan.rooms[0]!.doors[0]!;
    expect(door.strike).toBeNull();
    expect(door.footprints).toEqual([]);
    expect(door.clearance!.furnitureId).toBe('F-07');
    expect(door.clearance!.to).toEqual({ x: 3620, y: 230 });
    expect(door.clearance!.valueMm).toBeCloseTo(391.49, 2);
  });

  it('R-513 is placed at its origin and mirrors R-512', () => {
    const scene = createAsterHouseScene();
    const plan = buildPlanModel(scene, analyzeScene(scene));
    expect(plan.rooms[1]!.doors[0]!.hinge).toEqual({ x: 6150 + 4300, y: 0 });
    const f17 = plan.rooms[1]!.furniture.find((f) => f.furnitureId === 'F-17')!;
    expect(Math.min(...f17.polygon.map((p) => p.x))).toBe(6150 + 1900);
  });

  it('the hinge map strip covers the whole wall with no gaps', () => {
    const scene = createAsterHouseScene();
    const room = scene.rooms[0]!;
    const maps = new Map([['D-101', computeHingeMap(room, room.doors[0]!, scene.settings)]]);
    const plan = buildPlanModel(scene, analyzeScene(scene), { hingeMaps: maps });
    const bands = plan.rooms[0]!.doors[0]!.hingeBands;
    expect(bands[0]!.from.x).toBe(0);
    expect(bands[bands.length - 1]!.to.x).toBe(6000);
    for (let i = 1; i < bands.length; i += 1) expect(bands[i]!.from.x).toBe(bands[i - 1]!.to.x);
  });

  it('an invalid door is still drawn where the designer put it', () => {
    const scene = withHinge(5400);
    const plan = buildPlanModel(scene, analyzeScene(scene));
    const door = plan.rooms[0]!.doors[0]!;
    expect(door.validity).toBe('INVALID');
    expect(door.openingTo.x).toBe(6250);
  });
});
