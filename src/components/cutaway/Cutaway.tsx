'use client';

/**
 * 3D cutaway. Visualises buildCutawayModel(scene, analysis); never a source of results.
 * No network assets: lights and materials only.
 */

import { Html, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import * as THREE from 'three';

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;
import { formatDeg } from '@/domain/format';
import { buildCutawayModel, CUT_HEIGHT_MM, type CutawayBox, type CutawayDoor } from '@/render/cutawayModel';
import { useActiveView } from '@/state/hooks';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/ui/useBrowser';
import styles from './cutaway.module.css';

type Preset = 'axonometric' | 'entry' | 'top';

const FURNITURE_COLOR: Record<string, string> = {
  bed: '#e4ddd0',
  nightstand: '#b99d7c',
  desk: '#b99d7c',
  chair: '#8f9e9a',
  'lounge-chair': '#8f9e9a',
  console: '#a7865f',
  wardrobe: '#cbbfad',
  'media-unit': '#b7a891',
  table: '#b99d7c',
  other: '#c9c3b6',
};

function statusColor(status: CutawayBox['status'], fallback: string): string {
  if (status === 'CONFLICT' || status === 'INVALID') return '#ca6758';
  if (status === 'CONTACT_REVIEW' || status === 'NEAR_CLEARANCE') return '#c99a6c';
  return fallback;
}

function Box({ box, focusRoomId }: { box: CutawayBox; focusRoomId: string }) {
  const dim = box.roomId !== focusRoomId;
  const color =
    box.kind === 'floor'
      ? dim
        ? '#ebe8e1'
        : '#f3f0e8'
      : box.kind === 'furniture'
        ? statusColor(box.status, FURNITURE_COLOR[box.category ?? 'other'] ?? '#c9c3b6')
        : '#e6e1d7';
  const highlight = box.kind === 'furniture' && box.status !== 'PASS';
  return (
    <group position={box.center as unknown as THREE.Vector3Tuple}>
      <mesh castShadow={box.kind !== 'floor'} receiveShadow>
        <boxGeometry args={box.size as unknown as [number, number, number]} />
        <meshStandardMaterial
          color={color}
          roughness={box.kind === 'floor' ? 0.95 : 0.82}
          metalness={0}
          emissive={highlight ? '#ca6758' : '#000000'}
          emissiveIntensity={highlight ? 0.18 : 0}
          transparent={dim && box.kind === 'furniture'}
          opacity={dim && box.kind === 'furniture' ? 0.7 : 1}
        />
      </mesh>
      {box.kind === 'wall' || box.kind === 'lintel' ? (
        // Cut face: walls are sectioned at the cut height and capped in ink, like a drawing.
        <mesh position={[0, box.size[1] / 2 + 0.006, 0]}>
          <boxGeometry args={[box.size[0] + 0.001, 0.012, box.size[2] + 0.001]} />
          <meshBasicMaterial color="#202b31" />
        </mesh>
      ) : null}
      {highlight ? (
        <Html center position={[0, box.size[1] / 2 + 0.18, 0]} className={styles.label3d} zIndexRange={[20, 0]}>
          <span data-status={box.status}>{box.label}</span>
        </Html>
      ) : null}
    </group>
  );
}

function Sweep({ door }: { door: CutawayDoor }) {
  const geometry = useMemo(() => {
    if (!door.sweep) return null;
    const shape = new THREE.Shape(door.sweep.map((p) => new THREE.Vector2(p[0], -p[2])));
    return new THREE.ShapeGeometry(shape);
  }, [door.sweep]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  if (!geometry) return null;
  const conflict = door.status === 'CONFLICT' || door.status === 'INVALID';
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <meshBasicMaterial color={conflict ? '#ca6758' : '#31566f'} transparent opacity={conflict ? 0.22 : 0.16} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

function Leaf({ door, replayKey, reduced, focus }: { door: CutawayDoor; replayKey: number; reduced: boolean; focus: boolean }) {
  const group = useRef<THREE.Group>(null);
  const current = useRef(reduced ? door.openingDeg : 0);
  const { invalidate } = useThree();
  const target = door.openingDeg;
  useEffect(() => {
    if (!reduced) current.current = 0;
    invalidate();
  }, [replayKey, reduced, invalidate]);
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    if (reduced) current.current = target;
    else {
      const diff = target - current.current;
      if (Math.abs(diff) > 0.05) {
        current.current += Math.sign(diff) * Math.min(Math.abs(diff), delta * 70);
        invalidate();
      } else current.current = target;
    }
    g.rotation.y = door.closedYaw + door.openSign * THREE.MathUtils.degToRad(current.current);
  });
  const conflict = door.status === 'CONFLICT';
  return (
    <group ref={group} position={door.hinge as unknown as THREE.Vector3Tuple} rotation={[0, door.closedYaw, 0]}>
      <mesh castShadow position={[door.widthM / 2, door.heightM / 2, (door.openSign * -door.thicknessM) / 2]}>
        <boxGeometry args={[door.widthM, door.heightM, door.thicknessM]} />
        <meshStandardMaterial color={conflict ? '#e4b3aa' : '#f4f1ea'} roughness={0.6} transparent opacity={0.94} />
      </mesh>
      {focus ? (
        <Html center position={[door.widthM / 2, door.heightM + 0.22, 0]} className={styles.label3d} zIndexRange={[20, 0]}>
          <span data-status={door.status}>
            {door.doorId} · {formatDeg(door.openingDeg)}
          </span>
        </Html>
      ) : null}
    </group>
  );
}

function CameraRig({ preset, focus, extent, hinge, reduced }: { preset: Preset; focus: readonly [number, number, number]; extent: number; hinge: readonly [number, number, number] | null; reduced: boolean }) {
  const { camera, invalidate } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    const [fx, , fz] = focus;
    const k = extent / 6;
    const positions: Record<Preset, [number, number, number]> = {
      axonometric: [fx - 5.4 * k, 6.6 * k, fz + 6.4 * k],
      entry: [hinge ? hinge[0] + 0.6 : fx, 1.75, (hinge ? hinge[2] : fz) + 3.4],
      top: [fx, 10.5 * k, fz + 0.01],
    };
    const target: [number, number, number] = preset === 'entry' ? [fx, 0.6, fz - 0.4] : [fx, 0, fz];
    camera.position.set(...positions[preset]);
    controls.current?.target.set(...target);
    controls.current?.update();
    camera.lookAt(...target);
    invalidate();
  }, [preset, focus, extent, hinge, camera, invalidate]);
  return <OrbitControls ref={controls} makeDefault enableDamping={!reduced} dampingFactor={0.12} maxPolarAngle={Math.PI / 2.05} minDistance={2} maxDistance={24} />;
}

export function Cutaway() {
  const view = useActiveView();
  const reduced = usePrefersReducedMotion();
  const [preset, setPreset] = useState<Preset>('axonometric');
  const [replay, setReplay] = useState(0);
  const webgl = useWebGLSupport();
  const model = useMemo(() => buildCutawayModel(view.scene, view.analysis, 'R-512'), [view.scene, view.analysis]);
  const focusDoor = model.doors.find((d) => d.doorId === 'D-101') ?? null;

  if (webgl === false) {
    return (
      <div className={styles.fallback} role="note">
        <p>
          <strong>3D cutaway unavailable.</strong> This browser has WebGL turned off or unsupported. The plan, analysis and documents above are
          unaffected: they are computed independently of the 3D view.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap} data-testid="cutaway" data-opening={focusDoor ? focusDoor.openingDeg.toFixed(1) : ''}>
      <div className={styles.toolbar}>
        <span className={styles.title}>3D cutaway · walls cut at {CUT_HEIGHT_MM.toLocaleString('en-GB')} mm</span>
        <div className={styles.presets} role="group" aria-label="Camera">
          {(['axonometric', 'entry', 'top'] as const).map((p) => (
            <button key={p} type="button" aria-pressed={preset === p} onClick={() => setPreset(p)}>
              {p === 'axonometric' ? 'Axo' : p === 'entry' ? 'Entry' : 'Top'}
            </button>
          ))}
          <button type="button" onClick={() => setReplay((n) => n + 1)} disabled={reduced} title={reduced ? 'Disabled: reduced motion' : 'Replay the door swing'}>
            Replay swing
          </button>
        </div>
      </div>
      {webgl ? (
        <Canvas
          className={styles.canvas}
          shadows
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: 38, near: 0.1, far: 80, position: [-4, 6, 8] }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          aria-label="3D cutaway of the rooms"
          role="img"
        >
          <color attach="background" args={['#f4f2ec']} />
          <hemisphereLight args={['#fbfaf6', '#c9c3b6', 0.95]} />
          <directionalLight
            position={[model.focus[0] - 4, 9, model.focus[2] + 5]}
            intensity={1.7}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-9}
            shadow-camera-right={9}
            shadow-camera-top={9}
            shadow-camera-bottom={-9}
            shadow-bias={-0.0004}
          />
          <ambientLight intensity={0.18} />
          {model.boxes.map((b) => (
            <Box key={b.key} box={b} focusRoomId="R-512" />
          ))}
          {model.doors.map((d) => (
            <group key={d.doorId}>
              <Sweep door={d} />
              <Leaf door={d} replayKey={replay} reduced={reduced} focus={d.doorId === 'D-101'} />
            </group>
          ))}
          <CameraRig preset={preset} focus={model.focus} extent={model.extentM} hinge={focusDoor?.hinge ?? null} reduced={reduced} />
        </Canvas>
      ) : (
        <div className={styles.fallback}>Preparing 3D…</div>
      )}
    </div>
  );
}
