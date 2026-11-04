/**
 * Everything the WebGL white model draws, derived only from the render models in src/render:
 * boxes, doors and sweeps from buildCutawayModel (world metres); linework, strike points and
 * overlap footprints from buildPlanModel (global plan mm, converted with planToWorld). No
 * coordinates or statuses are made up here; this module only selects and groups them.
 */

import type { SceneAnalysis } from '@/domain/analysis/analyze';
import type { Vec } from '@/domain/geometry/frame';
import type { Scene } from '@/domain/model/types';
import { buildCutawayModel, CUT_HEIGHT_MM, type CutawayBox, type CutawayDoor } from '@/render/cutawayModel';
import { buildPlanModel, type PlanDoor, type PlanModel, type PlanRoom } from '@/render/planModel';
import { planToWorld, worldToPlan, type WorldPoint } from '@/render/transforms';

export type V3 = readonly [number, number, number];

/** Thickness of the model base (the board the study model is built on), metres. */
export const BASE_THICKNESS_M = 0.12;
/** Margin of the base beyond the outer wall faces, as a fraction of the room's larger side. */
const BASE_MARGIN_RATIO = 0.075;

export interface StudyBase {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  /** Top of the base = finished floor level (y = 0). */
  readonly topY: number;
  readonly thickness: number;
}

export interface StudyModel {
  readonly roomId: string;
  readonly doorId: string | null;
  /** Wall and lintel pieces of the focus room, cut at CUT_HEIGHT_MM. */
  readonly walls: readonly CutawayBox[];
  readonly furniture: readonly CutawayBox[];
  readonly door: CutawayDoor | null;
  readonly plan: PlanModel;
  readonly planRoom: PlanRoom;
  readonly planDoor: PlanDoor | null;
  readonly base: StudyBase;
  /** World XZ unit vectors: into the room from the door's wall, and along the closed leaf. */
  readonly inward: readonly [number, number];
  readonly along: readonly [number, number];
  /** Point sets used to frame each camera pose. */
  readonly framing: { readonly room: readonly V3[]; readonly door: readonly V3[]; readonly plan: readonly V3[] };
  readonly cutHeightM: number;
  /** Furniture heights in metres, keyed by furniture ID (from the cutaway boxes). */
  readonly heightM: ReadonlyMap<string, number>;
}

function corners(box: CutawayBox, top = true, bottom = true): V3[] {
  const [cx, cy, cz] = box.center;
  const [sx, sy, sz] = box.size;
  const out: V3[] = [];
  for (const y of [...(bottom ? [cy - sy / 2] : []), ...(top ? [cy + sy / 2] : [])]) {
    for (const dx of [-sx / 2, sx / 2]) for (const dz of [-sz / 2, sz / 2]) out.push([cx + dx, y, cz + dz]);
  }
  return out;
}

/** A plan direction (global plan mm, y north) as a unit vector in the world XZ plane. */
function planDirection(d: Vec): [number, number] {
  const w = planToWorld(d);
  const len = Math.hypot(w[0], w[2]) || 1;
  return [w[0] / len, w[2] / len];
}

const toV3 = (w: WorldPoint): V3 => [w[0], w[1], w[2]];

export function buildStudyModel(scene: Scene, analysis: SceneAnalysis, focusRoomId: string, doorId?: string | null): StudyModel {
  const cutaway = buildCutawayModel(scene, analysis, focusRoomId);
  const roomId = scene.rooms.some((r) => r.id === focusRoomId) ? focusRoomId : scene.rooms[0]!.id;
  const focusDoorId = doorId ?? scene.rooms.find((r) => r.id === roomId)?.doors[0]?.id ?? null;
  const plan = buildPlanModel(scene, analysis, { selectedId: focusDoorId });
  const planRoom = plan.rooms.find((r) => r.roomId === roomId)!;
  const planDoor = planRoom.doors.find((d) => d.doorId === focusDoorId) ?? null;
  const door = cutaway.doors.find((d) => d.doorId === focusDoorId) ?? null;

  const walls = cutaway.boxes.filter((b) => b.roomId === roomId && (b.kind === 'wall' || b.kind === 'lintel'));
  const furniture = cutaway.boxes.filter((b) => b.roomId === roomId && b.kind === 'furniture');
  const heightM = new Map(furniture.map((f) => [f.elementId, f.size[1]]));

  const xs = walls.flatMap((w) => [w.center[0] - w.size[0] / 2, w.center[0] + w.size[0] / 2]);
  const zs = walls.flatMap((w) => [w.center[2] - w.size[2] / 2, w.center[2] + w.size[2] / 2]);
  const margin = BASE_MARGIN_RATIO * Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  const base: StudyBase = {
    minX: Math.min(...xs) - margin,
    maxX: Math.max(...xs) + margin,
    minZ: Math.min(...zs) - margin,
    maxZ: Math.max(...zs) + margin,
    topY: 0,
    thickness: BASE_THICKNESS_M,
  };

  // Camera basis from the door frame: look from inside the room toward the door's wall.
  const inward = planDoor ? planDirection({ x: -planDoor.outward.x, y: -planDoor.outward.y }) : ([0, -1] as [number, number]);
  const sign = planDoor && planDoor.leafDirection === 'toward-start' ? -1 : 1;
  const along = planDoor ? planDirection({ x: planDoor.tangent.x * sign, y: planDoor.tangent.y * sign }) : ([1, 0] as [number, number]);

  const leafHeightMm = door ? worldToPlan([0, door.heightM, 0]).heightMm : 0;
  const leafPoints: V3[] = planDoor ? planDoor.leaf.flatMap((p) => [toV3(planToWorld(p, 0)), toV3(planToWorld(p, leafHeightMm))]) : [];
  const sweepPoints: V3[] = planDoor?.sweep ? planDoor.sweep.map((p) => toV3(planToWorld(p, 0))) : [];
  const related = new Set<string>();
  if (planDoor) {
    for (const id of [planDoor.clearance?.furnitureId, planDoor.intrusion?.furnitureId, planDoor.strike?.furnitureId]) if (id) related.add(id);
    for (const f of planDoor.footprints) related.add(f.furnitureId);
  }
  for (const f of furniture) if (f.status !== 'PASS') related.add(f.elementId);

  const room = [...walls.flatMap((w) => corners(w)), ...furniture.flatMap((f) => corners(f, true, false)), ...leafPoints];
  const doorFraming = [...sweepPoints, ...leafPoints, ...furniture.filter((f) => related.has(f.elementId)).flatMap((f) => corners(f))];
  const planFraming = walls.flatMap((w) => corners(w, false, true));

  return {
    roomId,
    doorId: focusDoorId,
    walls,
    furniture,
    door,
    plan,
    planRoom,
    planDoor,
    base,
    inward,
    along,
    framing: { room, door: doorFraming.length ? doorFraming : room, plan: planFraming },
    cutHeightM: planToWorld({ x: 0, y: 0 }, CUT_HEIGHT_MM)[1],
    heightM,
  };
}
