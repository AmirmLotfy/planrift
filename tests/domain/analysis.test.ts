import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { analyzeScene, doorAnalysis, pairsForDoor, type PairStatus } from '@/domain/analysis/analyze';
import { explainPair } from '@/domain/analysis/explain';
import { computeHingeMap } from '@/domain/analysis/hingeMap';
import { sceneSchema, type Room, type Scene } from '@/domain/model/schema';
import { createAsterHouseScene, FLAGSHIP } from '@/domain/seed/asterHouse';

function withHinge(scene: Scene, doorId: string, offset: number): Scene {
  const next = structuredClone(scene);
  for (const room of next.rooms) for (const door of room.doors) if (door.id === doorId) door.hingeOffsetMm = offset;
  return next;
}

function pair(scene: Scene, doorId: string, furnitureId: string) {
  const result = pairsForDoor(analyzeScene(scene), doorId).find((p) => p.furnitureId === furnitureId);
  if (!result) throw new Error(`pair ${doorId}/${furnitureId} missing`);
  return result;
}

describe('Aster House seed', () => {
  it('passes the canonical schema', () => {
    expect(sceneSchema.safeParse(createAsterHouseScene()).success).toBe(true);
  });

  it('baseline analysis: every pair passes, no issues', () => {
    const analysis = analyzeScene(createAsterHouseScene());
    expect(analysis.issues).toEqual([]);
    expect(analysis.status).toBe('PASS');
    expect(analysis.pairCount).toBe(18);
    expect(doorAnalysis(analysis, 'D-101')!.maxOpeningDeg).toBe(90);
  });

  it('R-513 mirrors R-512: identical clearance for the mirrored console', () => {
    const scene = createAsterHouseScene();
    const a = pair(scene, 'D-101', 'F-07');
    const b = pair(scene, 'D-102', 'F-17');
    expect(b.separation!.valueMm).toBeCloseTo(a.separation!.valueMm, 9);
    expect(b.status).toBe(a.status);
  });
});

describe('flagship demonstration sequence', () => {
  it('revision A (hinge 3000 mm) is a computed CONFLICT with F-07 only', () => {
    const scene = withHinge(createAsterHouseScene(), 'D-101', FLAGSHIP.revisionAHingeMm);
    const analysis = analyzeScene(scene);
    const statuses = pairsForDoor(analysis, 'D-101').map((p) => [p.furnitureId, p.status]);
    expect(statuses.filter(([, s]) => s !== 'PASS')).toEqual([['F-07', 'CONFLICT']]);
    const door = doorAnalysis(analysis, 'D-101')!;
    expect(door.maxOpeningDeg).toBeCloseTo(15.7, 1);
    expect(door.limitingFurnitureId).toBe('F-07');
    const text = explainPair(scene, door, pair(scene, 'D-101', 'F-07'));
    expect(text.headline).toContain('15.7°');
    expect(text.details.join(' ')).toContain('south face');
    expect(text.details.join(' ')).toContain('188.7 mm');
  });

  it('revision B (hinge 2400 mm) clears F-07 by 391.5 mm', () => {
    const scene = withHinge(createAsterHouseScene(), 'D-101', FLAGSHIP.revisionBHingeMm);
    expect(analyzeScene(scene).status).toBe('PASS');
    expect(pair(scene, 'D-101', 'F-07').separation!.valueMm).toBeCloseTo(391.49, 2);
  });

  it('hinge 5400 mm is INVALID: the leaf extends 250 mm beyond the east end of the south wall', () => {
    const scene = withHinge(createAsterHouseScene(), 'D-101', FLAGSHIP.invalidHingeMm);
    const analysis = analyzeScene(scene);
    expect(analysis.status).toBe('INVALID');
    const door = doorAnalysis(analysis, 'D-101')!;
    expect(door.validity).toBe('INVALID');
    expect(door.issues[0]!.message).toContain('250 mm beyond the east end of the south wall');
    expect(pairsForDoor(analysis, 'D-101').every((p) => p.status === 'INVALID')).toBe(true);
  });

  it('a 120° swing is UNSUPPORTED, never PASS', () => {
    const scene = createAsterHouseScene();
    scene.rooms[0]!.doors[0]!.swingDeg = 120;
    const analysis = analyzeScene(scene);
    expect(doorAnalysis(analysis, 'D-101')!.validity).toBe('UNSUPPORTED');
    expect(pairsForDoor(analysis, 'D-101').every((p) => p.status === 'UNSUPPORTED')).toBe(true);
    expect(analysis.status).toBe('UNSUPPORTED');
  });

  it('outward swings, sliding doors, rotated and circular furniture are UNSUPPORTED', () => {
    const outward = createAsterHouseScene();
    outward.rooms[0]!.doors[0]!.swingSide = 'exterior';
    expect(doorAnalysis(analyzeScene(outward), 'D-101')!.validity).toBe('UNSUPPORTED');
    const sliding = createAsterHouseScene();
    sliding.rooms[0]!.doors[0]!.operation = 'sliding';
    expect(doorAnalysis(analyzeScene(sliding), 'D-101')!.validity).toBe('UNSUPPORTED');
    const rotated = withHinge(createAsterHouseScene(), 'D-101', 3000);
    const fp = rotated.rooms[0]!.furniture.find((f) => f.id === 'F-07')!.footprint;
    if (fp.kind === 'rect') fp.rotationDeg = 15;
    expect(pair(rotated, 'D-101', 'F-07').status).toBe('UNSUPPORTED');
    const round = createAsterHouseScene();
    round.rooms[0]!.furniture.push({ id: 'F-20', name: 'Side table', category: 'table', heightMm: 500, footprint: { kind: 'circle', cx: 2000, cy: 400, radiusMm: 200 } });
    expect(pair(round, 'D-101', 'F-20').status).toBe('UNSUPPORTED');
  });

  it('furniture outside the room or degenerate is INVALID', () => {
    const outside = createAsterHouseScene();
    const fp = outside.rooms[0]!.furniture.find((f) => f.id === 'F-03')!.footprint;
    if (fp.kind === 'rect') fp.maxY = 4620;
    const analysis = analyzeScene(outside);
    const issue = analysis.issues.find((i) => i.elementId === 'F-03');
    expect(issue?.code).toBe('furniture.outside-room');
    expect(issue?.message).toContain('120 mm beyond the north wall');
    expect(analysis.status).toBe('INVALID');
    const flat = createAsterHouseScene();
    const fp2 = flat.rooms[0]!.furniture.find((f) => f.id === 'F-07')!.footprint;
    if (fp2.kind === 'rect') fp2.maxX = fp2.minX;
    expect(pair(flat, 'D-101', 'F-07').status).toBe('INVALID');
    expect(sceneSchema.safeParse(flat).success).toBe(false);
  });

  it('furniture touching a wall is valid (closed intervals)', () => {
    const analysis = analyzeScene(createAsterHouseScene());
    expect(analysis.issues.filter((i) => i.elementId === 'F-01')).toEqual([]);
  });
});

describe('room isolation', () => {
  it('moving D-101 never changes any R-513 result', () => {
    const base = analyzeScene(createAsterHouseScene()).rooms.find((r) => r.roomId === 'R-513');
    fc.assert(
      fc.property(fc.integer({ min: -500, max: 6500 }), (offset) => {
        const moved = analyzeScene(withHinge(createAsterHouseScene(), 'D-101', offset)).rooms.find((r) => r.roomId === 'R-513');
        expect(moved).toEqual(base);
      }),
      { numRuns: 100 },
    );
  });
});

describe('hinge position map', () => {
  it('reproduces the documented D-101 status bands exactly', () => {
    const scene = createAsterHouseScene();
    const room = scene.rooms[0]!;
    const map = computeHingeMap(room, room.doors[0]!, scene.settings);
    expect(map.segments.map((s) => [s.fromMm, s.toMm, s.status])).toEqual([
      [0, 2698, 'PASS'],
      [2699, 2800, 'NEAR_CLEARANCE'],
      [2801, 2802, 'CONTACT_REVIEW'],
      [2803, 4098, 'CONFLICT'],
      [4099, 4101, 'CONTACT_REVIEW'],
      [4102, 4199, 'NEAR_CLEARANCE'],
      [4200, 5150, 'PASS'],
      [5151, 6000, 'INVALID'],
    ]);
    expect(map.segments.find((s) => s.status === 'CONFLICT')!.limitingIds).toEqual(['F-07']);
  });

  it('agrees with the full scene analysis at every integer offset', () => {
    const scene = createAsterHouseScene();
    const room = scene.rooms[0]!;
    const map = computeHingeMap(room, room.doors[0]!, scene.settings);
    for (let offset = 0; offset <= 6000; offset += 7) {
      const expected = doorAnalysis(analyzeScene(withHinge(scene, 'D-101', offset)), 'D-101')!.status;
      const segment = map.segments.find((s) => offset >= s.fromMm && offset <= s.toMm)!;
      expect(segment.status, `offset ${offset}`).toBe(expected);
    }
  });
});

/** Rotates a whole room 90° counter-clockwise: (x, y) -> (D - y, x). Walls rotate S->E->N->W. */
function rotateRoom(room: Room): Room {
  const W = room.widthMm;
  const D = room.depthMm;
  const nextSide = { south: 'east', east: 'north', north: 'west', west: 'south' } as const;
  const lengthOf = (side: keyof typeof nextSide) => (side === 'south' || side === 'north' ? W : D);
  const next = structuredClone(room);
  next.widthMm = D;
  next.depthMm = W;
  next.walls = room.walls.map((w) => ({ ...w, side: nextSide[w.side] }));
  next.doors = room.doors.map((d) => {
    const wall = room.walls.find((w) => w.id === d.wallId)!;
    // Offsets are measured along the wall from its start; rotation maps the start to the start.
    void lengthOf(wall.side);
    return { ...d };
  });
  next.furniture = room.furniture.map((f) => {
    if (f.footprint.kind !== 'rect') return f;
    const { minX, minY, maxX, maxY } = f.footprint;
    return { ...f, footprint: { ...f.footprint, minX: D - maxY, maxX: D - minY, minY: minX, maxY: maxX } };
  });
  return next;
}

/** Mirrors a room across its vertical centre line: x -> W - x; east/west swap, leaf directions flip on all walls. */
function mirrorRoom(room: Room): Room {
  const W = room.widthMm;
  const D = room.depthMm;
  const next = structuredClone(room);
  const sideSwap = { south: 'south', north: 'north', east: 'west', west: 'east' } as const;
  next.walls = room.walls.map((w) => ({ ...w, side: sideSwap[w.side] }));
  next.doors = room.doors.map((d) => {
    const wall = room.walls.find((w) => w.id === d.wallId)!;
    const length = wall.side === 'south' || wall.side === 'north' ? W : D;
    return {
      ...d,
      hingeOffsetMm: length - d.hingeOffsetMm,
      leafDirection: d.leafDirection === 'toward-end' ? 'toward-start' : 'toward-end',
    };
  });
  next.furniture = room.furniture.map((f) => {
    if (f.footprint.kind !== 'rect') return f;
    const { minX, maxX } = f.footprint;
    return { ...f, footprint: { ...f.footprint, minX: W - maxX, maxX: W - minX } };
  });
  return next;
}

describe('metamorphic invariance', () => {
  const statusesOf = (scene: Scene): [string, PairStatus, number | null][] =>
    analyzeScene(scene).rooms[0]!.pairs.map((p) => [p.key, p.status, p.separation ? Math.round(p.separation.valueMm * 1e6) / 1e6 : null]);

  const sceneWith = (room: Room): Scene => ({ ...createAsterHouseScene(), rooms: [room], links: [] });

  it('rotating the room (door moves to another wall) leaves every result unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5150 }), fc.integer({ min: 1, max: 3 }), (offset, turns) => {
        const room = withHinge(createAsterHouseScene(), 'D-101', offset).rooms[0]!;
        let rotated = room;
        for (let i = 0; i < turns; i += 1) rotated = rotateRoom(rotated);
        expect(statusesOf(sceneWith(rotated))).toEqual(statusesOf(sceneWith(room)));
      }),
      { numRuns: 60 },
    );
  });

  it('mirroring the room leaves every result unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 5150 }), (offset) => {
        const room = withHinge(createAsterHouseScene(), 'D-101', offset).rooms[0]!;
        expect(statusesOf(sceneWith(mirrorRoom(room)))).toEqual(statusesOf(sceneWith(room)));
      }),
      { numRuns: 60 },
    );
  });

  it('translating the room origin in the shared plan leaves every result unchanged', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50_000, max: 50_000 }), fc.integer({ min: -50_000, max: 50_000 }), (dx, dy) => {
        const scene = withHinge(createAsterHouseScene(), 'D-101', 3000);
        const moved = structuredClone(scene);
        moved.rooms[0]!.originMm = { x: dx, y: dy };
        expect(statusesOf(moved)).toEqual(statusesOf(scene));
      }),
      { numRuns: 30 },
    );
  });

  it('the same canonical scene always produces the same analysis', () => {
    const scene = withHinge(createAsterHouseScene(), 'D-101', 3000);
    expect(analyzeScene(structuredClone(scene))).toEqual(analyzeScene(scene));
  });
});
