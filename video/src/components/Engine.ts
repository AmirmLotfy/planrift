import { analyzeScene, doorAnalysis, pairsForDoor } from '@/domain/analysis/analyze';
import { formatDeg, formatMeasure } from '@/domain/format';
import { createAsterHouseScene, FLAGSHIP } from '@/domain/seed/asterHouse';

/** Values shown in callouts, computed by the app's engine (never typed in). */
function at(mm: number) {
  const scene = createAsterHouseScene();
  scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!.doors[0]!.hingeOffsetMm = mm;
  const analysis = analyzeScene(scene);
  const door = doorAnalysis(analysis, FLAGSHIP.doorId)!;
  const pair = pairsForDoor(analysis, FLAGSHIP.doorId).find((p) => p.furnitureId === FLAGSHIP.consoleId)!;
  return { scene, door, pair };
}

const A = at(FLAGSHIP.revisionAHingeMm);
const B = at(FLAGSHIP.revisionBHingeMm);
const base = at(FLAGSHIP.baselineHingeMm);

const room = A.scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!;
const consoleRect = room.furniture.find((f) => f.id === FLAGSHIP.consoleId)!.footprint as {
  minX: number;
  minY: number;
};
const leaf = room.doors[0]!.leafWidthMm;
const tau = A.scene.settings.contactToleranceMm;
// Governing candidate at Revision A (contract §4, S1): √(a1² + b1²) − R in the door's local frame.
const a1 = consoleRect.minX - FLAGSHIP.revisionAHingeMm;
const b1 = consoleRect.minY;
const n = a1 * a1 + b1 * b1;
const m = leaf - tau;

const num = (v: number) => v.toLocaleString('en-GB');
const strip = (s: string) => s.replace(/\s*mm$/, '');

export const ENGINE = {
  strike: strip(formatDeg(A.door.maxOpeningDeg ?? 90)).replace('°', ''),
  intrusion: strip(formatMeasure(-(A.pair.separation?.valueMm ?? 0))),
  clearB: strip(formatMeasure(B.pair.separation?.valueMm ?? 0)),
  clearBase: strip(formatMeasure(base.pair.separation?.valueMm ?? 0)),
  math: {
    display: `s = √(${a1}² + ${b1}²) − ${leaf} = √${num(n)} − ${leaf} = ${(Math.sqrt(n) - leaf).toFixed(2)} mm`,
    exact: `${num(n)} < ${m}² = ${num(m * m)}`,
    verdict: `⇒ s < −${tau} mm ⇒ Conflict`,
  },
};
