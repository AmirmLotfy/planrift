'use client';

/**
 * The white model: PLANRIFT's 3D view of a room, drawn only from the engine's render models
 * (buildStudyModel → cutaway boxes + plan door geometry + hinge map). A matte white study model
 * in soft daylight; the door is the one interactive object (grip blue), conflicts are red pen.
 *
 * - Camera pose and the model → drawing morph come from a SceneDrive (scroll writes it at frame
 *   rate without React renders); the scene reads it inside useFrame.
 * - Labels are plain DOM elements positioned by projecting world anchors each frame. drei <Html>
 *   is deliberately not used: it mounts its own React roots, which broke unmounting in the studio.
 * - frameloop="demand": nothing renders unless the drive, the props or an animation changed.
 */

import { Edges, Line } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import type { SceneAnalysis } from '@/domain/analysis/analyze';
import type { HingeMap } from '@/domain/analysis/hingeMap';
import type { Vec } from '@/domain/geometry/frame';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import type { Scene } from '@/domain/model/types';
import type { CutawayBox, CutawayDoor } from '@/render/cutawayModel';
import { dragHingeOffset, offsetAlongWall } from '@/render/interaction';
import { palette, statusStroke } from '@/render/palette';
import type { PlanDoor } from '@/render/planModel';
import { planToWorld, worldToPlan } from '@/render/transforms';
import { usePrefersReducedMotion } from '@/components/ui/useBrowser';
import type { SceneDrive } from './drive';
import { easeOut, progress } from './motion';
import { arcGoals, backVector, blendGoals, fitPose, type CameraGoal } from './posing';
import { buildStudyModel, type StudyModel, type V3 } from './studyModel';
import { furnitureTone, isAdvisory, isConflict, mixTone, sweepTone, tone } from './tones';
import css from './whiteModel.module.css';

export interface WhiteModelProps {
  readonly scene: Scene;
  readonly analysis: SceneAnalysis;
  readonly focusRoomId: string;
  readonly doorId?: string | null;
  readonly drive: SceneDrive;
  /** Status of the door at every hinge position; painted on the top of its wall when given. */
  readonly hingeMap?: HingeMap | null;
  readonly interactive?: boolean;
  readonly onHingeChange?: (mm: number) => void;
  readonly onDragChange?: (dragging: boolean) => void;
  /** Walls rise, furniture settles, the door swings (≤ 1.6 s). Skipped with reduced motion. */
  readonly intro?: boolean;
  readonly showLabels?: boolean;
  /** Adds a "drag" cue to the door tag (until the visitor has moved the door once). */
  readonly hint?: boolean;
  /** 'low' drops ambient occlusion and halves the shadow map (small or touch screens). */
  readonly quality?: 'high' | 'low';
  readonly className?: string;
  readonly ariaLabel: string;
  readonly children?: ReactNode;
}

type LabelKey = 'hinge' | 'door' | 'measure';
type EdgeGroup = 'wall' | 'furniture' | 'base' | 'leaf' | 'struck';
type FurnitureClass = 'plain' | 'advisory' | 'conflict';

interface LineMat {
  opacity: number;
  transparent: boolean;
  color: THREE.Color;
}

interface Look {
  readonly wall: THREE.MeshStandardMaterial;
  readonly base: THREE.MeshStandardMaterial;
  readonly furniture: Record<FurnitureClass, THREE.MeshStandardMaterial>;
  readonly leaf: THREE.MeshStandardMaterial;
  readonly ground: THREE.ShadowMaterial;
  readonly hit: THREE.MeshBasicMaterial;
  readonly edges: Record<EdgeGroup, Set<LineMat>>;
  /** Flat (drawing) colours each lit material fades to. */
  readonly lit: Map<THREE.MeshStandardMaterial, { lit: THREE.Color; flat: THREE.Color }>;
}

interface Shared {
  readonly look: Look;
  readonly intro: { start: number | null; enabled: boolean };
  /** Animated leaf yaw (world radians), read by the label projector. */
  readonly leaf: { yaw: number };
  /** Current morph, mirrored for components that fade with it. */
  readonly morph: { value: number };
  readonly labels: Partial<Record<LabelKey, HTMLElement | null>>;
  /** Material opacities scaled by the intro (marks fade in after the model is built). */
  readonly marks: Set<{ material: THREE.Material & { opacity: number }; base: number }>;
}

const INTRO = { wallFrom: 0.05, wallStagger: 0.05, wallDur: 0.62, furnFrom: 0.48, furnStagger: 0.06, furnDur: 0.55, doorFrom: 0.92, marksFrom: 1.05, marksDur: 0.5, total: 1.6 };
const EDGE_OPACITY: Record<EdgeGroup, readonly [number, number]> = {
  wall: [0.3, 0.95],
  furniture: [0.24, 0.85],
  base: [0.2, 0.22],
  leaf: [0.85, 0.95],
  struck: [0.85, 0.95],
};
const GROUND_SHADOW = 0.16;
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

const furnitureClass = (status: CutawayBox['status']): FurnitureClass => (isConflict(status) ? 'conflict' : isAdvisory(status) ? 'advisory' : 'plain');
const toVec3 = (p: V3) => new THREE.Vector3(p[0], p[1], p[2]);
const world = (p: Vec, heightM = 0): V3 => {
  const w = planToWorld(p);
  return [w[0], heightM, w[2]];
};

function introAt(shared: Shared, now: number, delay: number, duration: number): number {
  if (!shared.intro.enabled) return 1;
  if (shared.intro.start === null) return 0;
  return easeOut(progress(now - shared.intro.start, delay, delay + duration));
}

function createLook(): Look {
  const lit = new Map<THREE.MeshStandardMaterial, { lit: THREE.Color; flat: THREE.Color }>();
  const standard = (litColor: THREE.Color | string, flatColor: string, roughness = 0.92) => {
    const material = new THREE.MeshStandardMaterial({ color: litColor, roughness, metalness: 0 });
    lit.set(material, { lit: material.color.clone(), flat: new THREE.Color(flatColor) });
    return material;
  };
  return {
    wall: standard(tone.model, palette.ink),
    base: standard(tone.model, palette.paper, 0.96),
    furniture: {
      plain: standard(tone.furniture, palette.paper),
      advisory: standard(furnitureTone('NEAR_CLEARANCE'), '#FFF6DB'),
      conflict: standard(furnitureTone('CONFLICT'), palette.coralSoft, 0.85),
    },
    leaf: standard(mixTone(tone.model, tone.grip, 0.2), palette.ink, 0.6),
    ground: new THREE.ShadowMaterial({ opacity: GROUND_SHADOW, color: new THREE.Color('#1d2126') }),
    hit: new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    edges: { wall: new Set(), furniture: new Set(), base: new Set(), leaf: new Set(), struck: new Set() },
    lit,
  };
}

function applyMorph(look: Look, m: number) {
  for (const [material, { lit, flat }] of look.lit) {
    material.color.copy(lit).multiplyScalar(1 - m);
    material.emissive.copy(flat).multiplyScalar(m);
  }
  look.ground.opacity = GROUND_SHADOW * (1 - m);
  for (const group of Object.keys(look.edges) as EdgeGroup[]) {
    const [a, b] = EDGE_OPACITY[group];
    for (const mat of look.edges[group]) mat.opacity = a + (b - a) * m;
  }
}

/** Registers a drei <Edges> line material with an edge group so the morph can fade it. */
function edgeRef(look: Look, group: EdgeGroup) {
  return (edges: { material: unknown } | null) => {
    if (!edges) return;
    const material = edges.material as LineMat;
    material.transparent = true;
    look.edges[group].add(material);
    return () => {
      look.edges[group].delete(material);
    };
  };
}

/* ------------------------------------------------------------------ blocks */

function Block({ box, material, edges, delay, shared, kind }: { box: CutawayBox; material: THREE.Material; edges: EdgeGroup; delay: number; shared: Shared; kind: 'rise' | 'settle' }) {
  const group = useRef<THREE.Group>(null);
  const [cx, cy, cz] = box.center;
  const [sx, sy, sz] = box.size;
  const bottom = cy - sy / 2;
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const p = introAt(shared, clock.elapsedTime, delay, kind === 'rise' ? INTRO.wallDur : INTRO.furnDur);
    g.scale.set(sx, Math.max(0.001, sy * (kind === 'rise' ? p : 0.35 + 0.65 * p)), sz);
    g.position.set(cx, bottom + (kind === 'settle' ? (1 - p) * 0.45 : 0), cz);
    g.visible = p > 0.001;
  });
  return (
    <group ref={group} position={[cx, bottom, cz]} scale={[sx, sy, sz]}>
      <mesh geometry={UNIT_BOX} material={material} position={[0, 0.5, 0]} castShadow receiveShadow>
        <Edges ref={edgeRef(shared.look, edges)} color={edges === 'struck' ? palette.coral : palette.ink} lineWidth={edges === 'struck' ? 1.4 : 1} threshold={20} />
      </mesh>
    </group>
  );
}

function Base({ model, shared }: { model: StudyModel; shared: Shared }) {
  const { minX, maxX, minZ, maxZ, thickness } = model.base;
  return (
    <group>
      <mesh geometry={UNIT_BOX} material={shared.look.base} position={[(minX + maxX) / 2, -thickness / 2, (minZ + maxZ) / 2]} scale={[maxX - minX, thickness, maxZ - minZ]} receiveShadow castShadow>
        <Edges ref={edgeRef(shared.look, 'base')} color={palette.ink} lineWidth={1} threshold={20} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(minX + maxX) / 2, -thickness - 0.0005, (minZ + maxZ) / 2]} material={shared.look.ground} receiveShadow>
        <planeGeometry args={[60, 60]} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ door */

interface DoorProps {
  readonly door: CutawayDoor;
  readonly planDoor: PlanDoor;
  readonly cutHeightM: number;
  readonly shared: Shared;
  readonly reduced: boolean;
  readonly interactive: boolean;
  readonly onHingeChange?: (mm: number) => void;
  readonly onDragChange?: (dragging: boolean) => void;
}

function Door({ door, planDoor, cutHeightM, shared, reduced, interactive, onHingeChange, onDragChange }: DoorProps) {
  const swing = useRef<THREE.Group>(null);
  const angle = useRef<number | null>(null);
  const drag = useRef<{ grab: number; last: number } | null>(null);
  const latest = useRef({ planDoor, onHingeChange, onDragChange });
  const { gl, invalidate } = useThree();
  useLayoutEffect(() => {
    latest.current = { planDoor, onHingeChange, onDragChange };
  });

  useFrame(({ clock }, delta) => {
    const g = swing.current;
    if (!g) return;
    const target = door.openingDeg;
    const started = !shared.intro.enabled || (shared.intro.start !== null && clock.elapsedTime - shared.intro.start >= INTRO.doorFrom);
    if (angle.current === null) angle.current = shared.intro.enabled ? 0 : target;
    if (!started) angle.current = 0;
    else if (reduced) angle.current = target;
    else {
      const diff = target - angle.current;
      if (Math.abs(diff) > 0.02) {
        angle.current += diff * (1 - Math.exp(-Math.min(delta, 0.1) * 7.5));
        invalidate();
      } else angle.current = target;
    }
    const yaw = door.closedYaw + door.openSign * THREE.MathUtils.degToRad(angle.current);
    g.rotation.y = yaw - door.closedYaw;
    shared.leaf.yaw = yaw;
  });

  const pointToPlan = (ray: THREE.Ray): Vec | null => {
    const hit = ray.intersectPlane(FLOOR_PLANE, new THREE.Vector3());
    return hit ? worldToPlan([hit.x, hit.y, hit.z]).plan : null;
  };
  const end = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    drag.current = null;
    (e.target as unknown as Element).releasePointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = interactive ? 'grab' : '';
    latest.current.onDragChange?.(false);
  };

  const w = door.widthM;
  // The leaf is cut at the plan cut height like everything else in the model.
  const h = Math.min(door.heightM, cutHeightM);
  const t = door.thicknessM;
  return (
    <group position={door.hinge as unknown as THREE.Vector3Tuple} rotation={[0, door.closedYaw, 0]}>
      <group ref={swing}>
        <mesh geometry={UNIT_BOX} material={shared.look.leaf} position={[w / 2, h / 2, (door.openSign * t) / 2]} scale={[w, h, t]} castShadow receiveShadow>
          <Edges ref={edgeRef(shared.look, 'leaf')} color={palette.blueprint} lineWidth={1.25} threshold={20} />
        </mesh>
      </group>
      {interactive ? (
        // Grab area: the whole quarter square the leaf sweeps, so the door is easy to pick up.
        <mesh
          geometry={UNIT_BOX}
          material={shared.look.hit}
          position={[w / 2, h / 2, (-door.openSign * w) / 2]}
          scale={[w * 1.08, h, w * 1.08]}
          onPointerOver={() => {
            if (!drag.current) gl.domElement.style.cursor = 'grab';
          }}
          onPointerOut={() => {
            if (!drag.current) gl.domElement.style.cursor = '';
          }}
          onPointerDown={(e) => {
            const p = pointToPlan(e.ray);
            if (!p || e.button !== 0) return;
            e.stopPropagation();
            (e.target as unknown as Element).setPointerCapture?.(e.pointerId);
            const pd = latest.current.planDoor;
            drag.current = { grab: offsetAlongWall(pd, p) - pd.hingeOffsetMm, last: pd.hingeOffsetMm };
            gl.domElement.style.cursor = 'grabbing';
            latest.current.onDragChange?.(true);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const p = pointToPlan(e.ray);
            if (!p) return;
            const mm = dragHingeOffset(latest.current.planDoor, p, d.grab, e.nativeEvent.altKey ? 1 : 10);
            if (mm !== d.last) {
              d.last = mm;
              latest.current.onHingeChange?.(mm);
            }
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={end}
        />
      ) : null}
    </group>
  );
}

/** Sector fill on the floor, its arc, the red-pen overlap on struck furniture, strike ring and measure. */
function SwingMarks({ planDoor, model, shared }: { planDoor: PlanDoor; model: StudyModel; shared: Shared }) {
  const swingTone = sweepTone(planDoor.status);
  const sector = useMemo(() => {
    if (!planDoor.sweep) return null;
    return new THREE.ShapeGeometry(new THREE.Shape(planDoor.sweep.map((p) => new THREE.Vector2(p.x / 1000, p.y / 1000))));
  }, [planDoor.sweep]);
  const overlaps = useMemo(
    () =>
      planDoor.footprints.map((f) => ({
        key: f.furnitureId,
        top: (model.heightM.get(f.furnitureId) ?? 0) + 0.003,
        geometry: new THREE.ShapeGeometry(new THREE.Shape(f.polygon.map((p) => new THREE.Vector2(p.x / 1000, p.y / 1000)))),
      })),
    [planDoor.footprints, model.heightM],
  );
  useEffect(() => () => sector?.dispose(), [sector]);
  useEffect(() => () => overlaps.forEach((o) => o.geometry.dispose()), [overlaps]);

  const fill = useMemo(() => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), []);
  const red = useMemo(() => new THREE.MeshBasicMaterial({ color: palette.coral, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }), []);
  useEffect(() => {
    fill.color.set(swingTone.fill);
    const entries = [
      { material: fill, base: swingTone.opacity },
      { material: red, base: 0.6 },
    ];
    entries.forEach((e) => shared.marks.add(e));
    return () => entries.forEach((e) => shared.marks.delete(e));
  }, [fill, red, swingTone.fill, swingTone.opacity, shared]);
  useEffect(
    () => () => {
      fill.dispose();
      red.dispose();
    },
    [fill, red],
  );

  const arc = planDoor.arc?.map((p) => world(p, 0.006));
  const strike = planDoor.strike;
  const strikeTop = strike ? (model.heightM.get(strike.furnitureId) ?? 0) + 0.006 : 0;
  const ring = strike
    ? Array.from({ length: 41 }, (_, i): V3 => {
        const a = (i / 40) * Math.PI * 2;
        const c = world(strike.point, strikeTop);
        return [c[0] + Math.cos(a) * 0.09, strikeTop, c[2] + Math.sin(a) * 0.09];
      })
    : null;
  const measure = planDoor.intrusion ?? planDoor.clearance;
  const measureTone = measure ? (isConflict(measure.status) ? palette.coral : statusStroke[measure.status]) : palette.ink;

  return (
    <group>
      {sector ? <mesh geometry={sector} material={fill} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} /> : null}
      {arc && arc.length > 1 ? <Line points={arc} color={swingTone.arc} lineWidth={1.5} transparent opacity={0.95} /> : null}
      {overlaps.map((o) => (
        <mesh key={o.key} geometry={o.geometry} material={red} rotation={[-Math.PI / 2, 0, 0]} position={[0, o.top, 0]} />
      ))}
      {ring ? <Line points={ring} color={palette.coral} lineWidth={2} /> : null}
      {measure ? <Line points={[world(measure.from, 0.008), world(measure.to, 0.008)]} color={measureTone} lineWidth={2} /> : null}
    </group>
  );
}

/** The door's status at every hinge position, painted along the top of its wall, plus the hinge pin. */
function WallStrip({ planDoor, map, model, shared }: { planDoor: PlanDoor; map: HingeMap; model: StudyModel; shared: Shared }) {
  const top = model.cutHeightM + 0.0025;
  const half = planDoor.wallThicknessMm / 2;
  const at = (mm: number, out: number): Vec => ({
    x: planDoor.wallStart.x + planDoor.tangent.x * mm + planDoor.outward.x * out,
    y: planDoor.wallStart.y + planDoor.tangent.y * mm + planDoor.outward.y * out,
  });
  const openA = offsetAlongWall(planDoor, planDoor.openingFrom);
  const openB = offsetAlongWall(planDoor, planDoor.openingTo);
  const [lo, hi] = [Math.min(openA, openB), Math.max(openA, openB)];
  const pieces = map.segments.flatMap((s) => {
    const a = s.fromMm;
    const b = s.toMm + (s.toMm < map.wallLengthMm ? 1 : 0);
    const parts: [number, number][] = [];
    if (a < lo) parts.push([a, Math.min(b, lo)]);
    if (b > hi) parts.push([Math.max(a, hi), b]);
    return parts.filter(([p, q]) => q - p > 0.5).map(([p, q]) => ({ key: `${s.fromMm}-${p}`, from: p, to: q, status: s.status }));
  });
  const materials = useMemo(() => {
    const make = (color: string) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.92, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    return {
      PASS: make(statusStroke.PASS),
      NEAR_CLEARANCE: make(statusStroke.NEAR_CLEARANCE),
      CONTACT_REVIEW: make(statusStroke.CONTACT_REVIEW),
      CONFLICT: make(statusStroke.CONFLICT),
      INVALID: make(statusStroke.INVALID),
      UNSUPPORTED: make(statusStroke.UNSUPPORTED),
      pin: make(palette.blueprint),
    };
  }, []);
  useEffect(() => {
    const entries = Object.values(materials).map((material) => ({ material, base: 0.92 }));
    entries.forEach((e) => shared.marks.add(e));
    return () => {
      entries.forEach((e) => shared.marks.delete(e));
    };
  }, [materials, shared]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const band = half * 0.9;
  const quad = (from: number, to: number, inner: number, outer: number) => {
    const a = world(at(from, inner), top);
    const b = world(at(to, outer), top);
    return { cx: (a[0] + b[0]) / 2, cz: (a[2] + b[2]) / 2, sx: Math.abs(b[0] - a[0]), sz: Math.abs(b[2] - a[2]) };
  };
  const pin = quad(planDoor.hingeOffsetMm - 14, planDoor.hingeOffsetMm + 14, -40, planDoor.wallThicknessMm + 40);
  return (
    <group>
      {pieces.map((p) => {
        const q = quad(p.from, p.to, half - band / 2, half + band / 2);
        return (
          <mesh key={p.key} material={materials[p.status]} rotation={[-Math.PI / 2, 0, 0]} position={[q.cx, top, q.cz]}>
            <planeGeometry args={[Math.max(q.sx, 0.001), Math.max(q.sz, 0.001)]} />
          </mesh>
        );
      })}
      <mesh geometry={UNIT_BOX} material={materials.pin} position={[pin.cx, top + 0.012, pin.cz]} scale={[Math.max(pin.sx, 0.02), 0.024, Math.max(pin.sz, 0.02)]} />
    </group>
  );
}

/* ------------------------------------------------------------------ camera, labels, intro */

function applyCamera(camera: THREE.PerspectiveCamera, goal: CameraGoal, width: number, height: number) {
  const back = backVector(goal.azimuth, goal.elevation);
  camera.position.set(goal.target[0] + back[0] * goal.distance, goal.target[1] + back[1] * goal.distance, goal.target[2] + back[2] * goal.distance);
  camera.up.set(0, 1, 0);
  camera.lookAt(goal.target[0], goal.target[1], goal.target[2]);
  camera.fov = goal.fov;
  camera.near = Math.max(0.05, goal.distance * 0.25);
  camera.far = goal.distance * 3 + 20;
  camera.setViewOffset(width, height, (-goal.cx * width) / 2, (goal.cy * height) / 2, width, height);
  camera.updateProjectionMatrix();
  // Labels are projected before the renderer refreshes matrices, so refresh them here.
  camera.updateMatrixWorld();
}

function close(a: CameraGoal, b: CameraGoal): boolean {
  const e = 1e-4;
  return (
    Math.abs(a.azimuth - b.azimuth) < e &&
    Math.abs(a.elevation - b.elevation) < e &&
    Math.abs(a.distance - b.distance) < e * 10 &&
    Math.abs(a.fov - b.fov) < e &&
    Math.abs(a.cx - b.cx) < e &&
    Math.abs(a.cy - b.cy) < e &&
    Math.abs(a.target[0] - b.target[0]) < e &&
    Math.abs(a.target[1] - b.target[1]) < e &&
    Math.abs(a.target[2] - b.target[2]) < e
  );
}

function Rig({ model, drive, reduced, shared }: { model: StudyModel; drive: SceneDrive; reduced: boolean; shared: Shared }) {
  const { camera, size, invalidate } = useThree();
  const current = useRef<CameraGoal | null>(null);
  const morphed = useRef<number | null>(null);
  useEffect(() => drive.subscribe(() => invalidate()), [drive, invalidate]);
  useFrame((_, delta) => {
    const s = drive.get();
    const aspect = size.width / Math.max(1, size.height);
    const a = fitPose(model, s.from, aspect, s.frame);
    const b = s.t <= 0 || s.from === s.to ? null : fitPose(model, s.to, aspect, s.frame);
    const goal = !b ? a : Math.abs(b.elevation - a.elevation) > 0.5 ? arcGoals(a, b, s.t) : blendGoals(a, b, s.t);
    const c = current.current;
    if (!c || reduced) current.current = goal;
    else {
      const next = blendGoals(c, goal, 1 - Math.exp(-Math.min(delta, 0.1) * 9));
      current.current = close(next, goal) ? goal : next;
      if (current.current !== goal) invalidate();
    }
    applyCamera(camera as THREE.PerspectiveCamera, current.current, size.width, size.height);
    if (morphed.current !== s.morph) {
      morphed.current = s.morph;
      shared.morph.value = s.morph;
      applyMorph(shared.look, s.morph);
    }
  });
  return null;
}

interface Anchors {
  hinge: V3 | null;
  measure: V3 | null;
  door: { hinge: V3; width: number; height: number } | null;
}

function Projector({ anchors, drive, shared }: { anchors: Anchors; drive: SceneDrive; shared: Shared }) {
  const { camera, size } = useThree();
  const latest = useRef(anchors);
  useLayoutEffect(() => {
    latest.current = anchors;
  });
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const a = latest.current;
    const fade = introAt(shared, clock.elapsedTime, INTRO.marksFrom, INTRO.marksDur) * drive.get().labels;
    const place = (key: LabelKey, p: THREE.Vector3 | null) => {
      const el = shared.labels[key];
      if (!el) return;
      if (!p) {
        el.style.opacity = '0';
        return;
      }
      v.copy(p).project(camera);
      const behind = v.z > 1 || v.z < -1;
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = behind ? '0' : fade.toFixed(3);
    };
    place('hinge', a.hinge ? toVec3(a.hinge) : null);
    place('measure', a.measure ? toVec3(a.measure) : null);
    // From above, the door tag would sit on the measure tag; the drawn swing says it already.
    if (a.door && shared.morph.value < 0.5) {
      const yaw = shared.leaf.yaw;
      place('door', new THREE.Vector3(a.door.hinge[0] + Math.cos(yaw) * a.door.width, a.door.height, a.door.hinge[2] - Math.sin(yaw) * a.door.width));
    } else place('door', null);
  });
  return null;
}

function IntroClock({ shared }: { shared: Shared }) {
  const { invalidate } = useThree();
  useFrame(({ clock }) => {
    const { intro } = shared;
    if (intro.enabled && intro.start === null) intro.start = clock.elapsedTime;
    const fade = introAt(shared, clock.elapsedTime, INTRO.marksFrom, INTRO.marksDur);
    for (const { material, base } of shared.marks) material.opacity = base * fade;
    if (intro.enabled && intro.start !== null && clock.elapsedTime - intro.start < INTRO.total + 0.1) invalidate();
  });
  return null;
}

function Lights({ model, quality }: { model: StudyModel; quality: 'high' | 'low' }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const cx = (model.base.minX + model.base.maxX) / 2;
  const cz = (model.base.minZ + model.base.maxZ) / 2;
  const half = Math.max(model.base.maxX - model.base.minX, model.base.maxZ - model.base.minZ) / 2 + 1.2;
  // Soft daylight from behind the hero camera, 26° round and 54° up: the faces toward the viewer
  // are lit, short pale shadows fall away from it. A strong sky keeps every face of the white
  // model between 80 % and 98 % white (no tone mapping, so these values are what you see).
  const hero = fitPose(model, 'hero', 1.6, { left: 0, right: 1, top: 0, bottom: 1 });
  const sun = backVector(hero.azimuth - 0.45, 0.95);
  useLayoutEffect(() => {
    const l = light.current;
    if (!l) return;
    l.target.position.set(cx, 0, cz);
    l.target.updateMatrixWorld();
  }, [cx, cz]);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#d6d4cc', 2.4]} />
      <directionalLight
        ref={light}
        position={[cx + sun[0] * 14, sun[1] * 14, cz + sun[2] * 14]}
        intensity={1.05}
        color="#fffdf8"
        castShadow
        shadow-mapSize={quality === 'high' ? [2048, 2048] : [1024, 1024]}
        shadow-radius={14}
        shadow-blurSamples={20}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-half}
        shadow-camera-right={half}
        shadow-camera-top={half}
        shadow-camera-bottom={-half}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />
    </>
  );
}

type AOPass = { configuration: { intensity: number } };

function Effects({ drive }: { drive: SceneDrive }) {
  const ao = useRef<AOPass | null>(null);
  const last = useRef<number | null>(null);
  useFrame(() => {
    const m = drive.get().morph;
    if (ao.current && last.current !== m) {
      last.current = m;
      ao.current.configuration.intensity = 2.6 * (1 - m);
    }
  });
  return (
    <EffectComposer multisampling={4} enableNormalPass={false}>
      {/* halfRes stays off: n8ao 2.0.1's half-resolution path uses a multi-target class that
          three r187 rejects (render target `.texture` returned as an array). */}
      <N8AO ref={ao as never} aoRadius={0.55} distanceFalloff={0.6} intensity={2.6} quality="medium" halfRes={false} color="#000000" />
    </EffectComposer>
  );
}

/* ------------------------------------------------------------------ root */

/** Height the walls nearest the hero camera are cut at, so they never hide the room. */
const NEAR_WALL_M = 0.4;

/**
 * Display cut of the study model, like a sectional model on a table: everything is cut at the
 * plan cut height (furniture and the leaf included), and the two walls facing the hero camera
 * are cut low. Positions are untouched; only box heights change.
 */
function cutForViewing(m: StudyModel): StudyModel {
  const cut = m.cutHeightM;
  const cx = (m.base.minX + m.base.maxX) / 2;
  const cz = (m.base.minZ + m.base.maxZ) / 2;
  const back = backVector(fitPose(m, 'hero', 1.6, { left: 0, right: 1, top: 0, bottom: 1 }).azimuth, 0);
  const lower = (b: CutawayBox, h: number): CutawayBox => (b.size[1] <= h ? b : { ...b, center: [b.center[0], h / 2, b.center[2]], size: [b.size[0], h, b.size[2]] });
  const walls = m.walls.map((w) => {
    const dx = w.center[0] - cx;
    const dz = w.center[2] - cz;
    const near = (dx * back[0] + dz * back[2]) / (Math.hypot(dx, dz) || 1) > 0.35;
    return near && w.kind === 'wall' ? lower(w, NEAR_WALL_M) : w;
  });
  const furniture = m.furniture.map((f) => lower(f, cut));
  // Frame the room by its walls and furniture only, so moving the door never moves the camera.
  const room = [...m.walls, ...furniture].flatMap((b): V3[] => {
    const [bx, by, bz] = b.center;
    const [sx, sy, sz] = b.size;
    return [-1, 1].flatMap((dx) => [-1, 1].flatMap((dz) => [-1, 1].map((dy): V3 => [bx + (dx * sx) / 2, by + (dy * sy) / 2, bz + (dz * sz) / 2])));
  });
  // The plan is framed by the whole board (the sheet), top and bottom corners alike.
  const { minX, maxX, minZ, maxZ, thickness } = m.base;
  const plan: V3[] = [minX, maxX].flatMap((x) => [minZ, maxZ].flatMap((z): V3[] => [[x, 0, z], [x, cut, z], [x, -thickness, z]]));
  return { ...m, walls, furniture, heightM: new Map(furniture.map((f) => [f.elementId, f.size[1]])), framing: { ...m.framing, room, plan } };
}

function Stage({ model, props, shared, reduced, quality, anchors }: { model: StudyModel; props: WhiteModelProps; shared: Shared; reduced: boolean; quality: 'high' | 'low'; anchors: Anchors }) {
  const center = [(model.base.minX + model.base.maxX) / 2, (model.base.minZ + model.base.maxZ) / 2] as const;
  const angleOf = (b: CutawayBox) => Math.atan2(b.center[2] - center[1], b.center[0] - center[0]);
  const wallOrder = [...model.walls].sort((a, b) => angleOf(a) - angleOf(b)).map((b) => b.key);
  const furnitureOrder = [...model.furniture].sort((a, b) => a.center[0] - b.center[0]).map((b) => b.key);
  const { invalidate } = useThree();
  // Any new engine result (hinge moved, scenario switched) needs a frame.
  useEffect(() => invalidate(), [model, invalidate]);
  return (
    <>
      <color attach="background" args={[palette.canvas]} />
      <Lights model={model} quality={quality} />
      <Base model={model} shared={shared} />
      {model.walls.map((b) => (
        <Block key={b.key} box={b} material={shared.look.wall} edges="wall" delay={INTRO.wallFrom + INTRO.wallStagger * wallOrder.indexOf(b.key)} shared={shared} kind="rise" />
      ))}
      {model.furniture.map((b) => {
        const cls = furnitureClass(b.status);
        return (
          <Block
            key={b.key}
            box={b}
            material={shared.look.furniture[cls]}
            edges={cls === 'conflict' ? 'struck' : 'furniture'}
            delay={INTRO.furnFrom + INTRO.furnStagger * furnitureOrder.indexOf(b.key)}
            shared={shared}
            kind="settle"
          />
        );
      })}
      {model.door && model.planDoor ? (
        <>
          <Door
            door={model.door}
            planDoor={model.planDoor}
            cutHeightM={model.cutHeightM}
            shared={shared}
            reduced={reduced}
            interactive={props.interactive ?? false}
            onHingeChange={props.onHingeChange}
            onDragChange={props.onDragChange}
          />
          <SwingMarks planDoor={model.planDoor} model={model} shared={shared} />
          {props.hingeMap ? <WallStrip planDoor={model.planDoor} map={props.hingeMap} model={model} shared={shared} /> : null}
        </>
      ) : null}
      <Rig model={model} drive={props.drive} reduced={reduced} shared={shared} />
      <IntroClock shared={shared} />
      {quality === 'high' ? <Effects drive={props.drive} /> : null}
      <Projector anchors={anchors} drive={props.drive} shared={shared} />
    </>
  );
}

export function WhiteModel(props: WhiteModelProps) {
  const { scene, analysis, focusRoomId, doorId, showLabels = true, className, ariaLabel } = props;
  const reduced = usePrefersReducedMotion();
  const quality = props.quality ?? 'high';
  const study = useMemo(() => cutForViewing(buildStudyModel(scene, analysis, focusRoomId, doorId)), [scene, analysis, focusRoomId, doorId]);

  const shared = useMemo<Shared>(
    () => ({ look: createLook(), intro: { start: null, enabled: false }, leaf: { yaw: 0 }, morph: { value: -1 }, labels: {}, marks: new Set() }),
    [],
  );
  // The intro plays once per mount, and never with reduced motion.
  const introWanted = (props.intro ?? false) && !reduced;
  const introDecided = useRef(false);
  if (!introDecided.current) {
    shared.intro.enabled = introWanted;
    introDecided.current = true;
  }
  useEffect(
    () => () => {
      const { look } = shared;
      for (const material of [look.wall, look.base, look.leaf, look.ground, look.hit, ...Object.values(look.furniture)]) material.dispose();
    },
    [shared],
  );

  const pd = study.planDoor;
  const measure = pd ? (pd.intrusion ?? pd.clearance) : null;
  const anchors: Anchors = {
    hinge: pd
      ? world(
          { x: pd.hinge.x + (pd.outward.x * pd.wallThicknessMm) / 2, y: pd.hinge.y + (pd.outward.y * pd.wallThicknessMm) / 2 },
          study.cutHeightM + 0.34,
        )
      : null,
    measure: measure ? world({ x: (measure.from.x + measure.to.x) / 2, y: (measure.from.y + measure.to.y) / 2 }, 0.01) : null,
    door: study.door ? { hinge: [study.door.hinge[0], 0, study.door.hinge[2]], width: study.door.widthM, height: Math.min(study.door.heightM, study.cutHeightM) + 0.06 } : null,
  };
  const measureText = measure
    ? pd!.intrusion
      ? `${formatMeasure(Math.abs(measure.valueMm))} into ${measure.furnitureId}`
      : `${formatMeasure(measure.valueMm)} to ${measure.furnitureId}`
    : null;

  return (
    <div className={[css.root, className].filter(Boolean).join(' ')} data-status={pd?.status} data-hinge={pd?.hingeOffsetMm}>
      <Canvas
        className={css.canvas}
        frameloop="demand"
        flat
        shadows="percentage"
        dpr={[1, quality === 'high' ? 1.75 : 1.5]}
        gl={{ antialias: quality === 'low', alpha: false, powerPreference: 'high-performance' }}
        camera={{ fov: 30, near: 0.1, far: 120, position: [6, 8, 10] }}
        aria-label={ariaLabel}
        role="img"
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = 'pan-y';
        }}
      >
        <Stage model={study} props={props} shared={shared} reduced={reduced} quality={quality} anchors={anchors} />
      </Canvas>
      {showLabels && pd ? (
        <div className={css.labels} aria-hidden="true">
          <div
            ref={(el) => {
              shared.labels.hinge = el;
            }}
            className={css.label}
            data-kind="hinge"
          >
            <span className={css.labelInner}>{formatMm(pd.hingeOffsetMm)}</span>
          </div>
          <div
            ref={(el) => {
              shared.labels.door = el;
            }}
            className={css.label}
            data-kind="door"
            data-status={pd.status}
          >
            <span className={css.labelInner}>
              <i className={css.dot} />
              {pd.doorId} · {formatDeg(pd.leafAngleDeg)}
              {props.hint ? <b className={css.hint}>⟷ drag</b> : null}
            </span>
          </div>
          <div
            ref={(el) => {
              shared.labels.measure = el;
            }}
            className={css.label}
            data-kind="measure"
            data-status={measure?.status}
          >
            {measureText ? <span className={css.labelInner}>{measureText}</span> : null}
          </div>
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

export default WhiteModel;
