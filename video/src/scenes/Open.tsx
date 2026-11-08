import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { analyzeScene, doorAnalysis } from '@/domain/analysis/analyze';
import type { Vec } from '@/domain/geometry/frame';
import { formatDeg } from '@/domain/format';
import { createAsterHouseScene, FLAGSHIP } from '@/domain/seed/asterHouse';
import { cloudPath } from '@/render/cloud';
import { buildPlanModel, type PlanModel } from '@/render/planModel';
import { camAt, clamp01, easeIn, easeInOut, easeOut, prog, shake } from '../anim';
import { M } from '../data';
import { C, MONO, SANS } from '../theme';

/**
 * Cold open: the "horror story" drawn with PLANRIFT's own engine. Every wall, opening, swing and
 * the strike angle come from analyzeScene / buildPlanModel at the hinge shown in each frame.
 */
const BASE = createAsterHouseScene();
const ROOM = BASE.rooms.find((r) => r.id === FLAGSHIP.roomId)!;
const DOOR = ROOM.doors.find((d) => d.id === FLAGSHIP.doorId)!;
const PLAN_DOC = BASE.documents.find((d) => d.kind === 'drawing' && /plan/i.test(d.title))!;

const cache = new Map<number, { model: PlanModel; maxDeg: number }>();
function solve(mm: number) {
  let hit = cache.get(mm);
  if (!hit) {
    const scene = structuredClone(BASE);
    scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!.doors[0]!.hingeOffsetMm = mm;
    const analysis = analyzeScene(scene);
    hit = {
      model: buildPlanModel(scene, analysis, { selectedId: FLAGSHIP.doorId }),
      maxDeg: doorAnalysis(analysis, FLAGSHIP.doorId)!.maxOpeningDeg ?? 90,
    };
    cache.set(mm, hit);
  }
  return hit;
}

// Sheet in plan mm (y north). The room sits left; the title block bottom right.
const VB = { minX: -900, maxX: 9056, minY: -650, maxY: 4950 };
const VW = VB.maxX - VB.minX;
const VH = VB.maxY - VB.minY;
const sx = (p: Vec) => p.x;
const sy = (p: Vec) => -p.y;
const pts = (poly: readonly Vec[]) => poly.map((p) => `${sx(p).toFixed(1)},${sy(p).toFixed(1)}`).join(' ');
const per = (poly: readonly Vec[]) =>
  poly.reduce(
    (a, p, i) => a + Math.hypot(p.x - poly[(i + 1) % poly.length]!.x, p.y - poly[(i + 1) % poly.length]!.y),
    0,
  );

const T = {
  slideFrom: M.moves - 0.02,
  slideTo: M.moves + 1.75,
  cloud: M.moves + 1.4,
  stamp: M.out + 0.02,
  open: M.opens,
  impact: M.slams + 0.16,
};

export function Open() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const s = width / 2560;

  const hingeMm = Math.round(1700 + (3000 - 1700) * prog(t, T.slideFrom, T.slideTo, easeInOut));
  const { model, maxDeg } = solve(hingeMm);
  const room = model.rooms.find((r) => r.roomId === FLAGSHIP.roomId)!;
  const door = room.doors.find((d) => d.doorId === FLAGSHIP.doorId)!;
  const finalDoor = solve(3000).model.rooms.find((r) => r.roomId === FLAGSHIP.roomId)!.doors[0]!;
  const strikeDeg = solve(3000).maxDeg;

  // Leaf: closed until "opens", then accelerates into the console and stops at the strike angle.
  const swing = t < T.open ? 0 : strikeDeg * easeIn(clamp01((t - T.open) / (T.impact - T.open)));
  const impacted = t >= T.impact;
  const u = door.leafDirection === 'toward-end' ? door.tangent : { x: -door.tangent.x, y: -door.tangent.y };
  const v = { x: -door.outward.x, y: -door.outward.y };
  const R = door.leafWidthMm;
  const at = (deg: number, r = R): Vec => {
    const a = (deg * Math.PI) / 180;
    return {
      x: door.hinge.x + (u.x * Math.cos(a) + v.x * Math.sin(a)) * r,
      y: door.hinge.y + (u.y * Math.cos(a) + v.y * Math.sin(a)) * r,
    };
  };
  const th = DOOR.leafThicknessMm;
  const a = (swing * Math.PI) / 180;
  const side = {
    x: (u.x * Math.sin(a) - v.x * Math.cos(a)) * th,
    y: (u.y * Math.sin(a) - v.y * Math.cos(a)) * th,
  };
  const tip = at(swing);
  const leaf = [
    door.hinge,
    tip,
    { x: tip.x + side.x, y: tip.y + side.y },
    { x: door.hinge.x + side.x, y: door.hinge.y + side.y },
  ];
  const arcTo = (from: number, to: number, n = 48) =>
    Array.from({ length: n + 1 }, (_, i) => at(from + ((to - from) * i) / n));
  const swept = swing > 0.05 ? [door.hinge, ...arcTo(0, swing)] : null;
  const ghostArc = arcTo(0, 90);

  // Ink-on timings.
  const wallsInk = prog(t, 0.15, 2.0, easeInOut);
  const wallsFill = prog(t, 1.3, 2.4);
  const furnIn = (i: number) => prog(t, 0.9 + i * 0.12, 2.2 + i * 0.12, easeInOut);
  const doorIn = prog(t, 2.2, 2.9);
  const ghostIn = prog(t, 2.6, 3.6) * (1 - prog(t, T.open - 0.4, T.open));
  const cloudIn = prog(t, T.cloud, T.cloud + 1.1, easeInOut);
  const stampP = prog(t, T.stamp, T.stamp + 0.28, easeOut);
  const flash = impacted ? Math.exp(-(t - T.impact) / 0.22) : 0;
  const blockedIn = prog(t, T.impact + 0.12, T.impact + 0.9);

  // Camera (centre in plan mm, zoom) and impact shake.
  const cam = camAt(t, [
    { t: 0, x: 4000, y: 2150, z: 1.0 },
    { t: 3.6, x: 4000, y: 2150, z: 1.02 },
    { t: T.slideTo + 0.2, x: 3300, y: 1300, z: 1.42 },
    { t: T.stamp - 0.5, x: 5000, y: 900, z: 1.24 },
    { t: T.stamp + 0.8, x: 5000, y: 900, z: 1.24 },
    { t: T.impact - 0.1, x: 3520, y: 640, z: 2.35, e: easeInOut },
    { t: 13.8, x: 3560, y: 660, z: 2.5 },
  ]);
  const sh = shake(t, T.impact, 14 * s, 0.4);
  const pxPerMm = width / VW;
  const camTransform = `translate(${width / 2 + sh.x}px, ${height / 2 + sh.y}px) scale(${cam.z}) translate(${-(cam.x - VB.minX) * pxPerMm}px, ${-(VB.maxY - cam.y) * pxPerMm}px)`;
  const exit = prog(t, 13.25, 13.74, easeIn);

  const consoleItem = room.furniture.find((f) => f.furnitureId === FLAGSHIP.consoleId)!;
  const cloudRect = { x: 2820, y: -1180, width: 1440, height: 1500 };
  const strike = finalDoor.strike;
  const footprint = finalDoor.footprints[0];

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, overflow: 'hidden', opacity: 1 - exit * 0.15 }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: '0 0',
          transform: camTransform,
        }}
      >
        <svg
          viewBox={`${VB.minX} ${-VB.maxY} ${VW} ${VH}`}
          width={width}
          height={height}
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <pattern id="grid" width={500} height={500} patternUnits="userSpaceOnUse">
              <path d="M500 0H0V500" fill="none" stroke="#E9E9E4" strokeWidth={6} />
            </pattern>
            <pattern
              id="hatch"
              width={90}
              height={90}
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width={90} height={90} fill={C.redTint} />
              <path d="M0 0V90" stroke={C.red} strokeWidth={22} />
            </pattern>
          </defs>
          <rect
            x={VB.minX - 4000}
            y={-VB.maxY - 4000}
            width={VW + 8000}
            height={VH + 8000}
            fill="url(#grid)"
            opacity={prog(t, 0, 0.8)}
          />
          {/* Room interior */}
          <polygon points={pts(room.interior)} fill="#FFFFFF" opacity={wallsFill} />
          {/* Furniture */}
          {room.furniture.map((f, i) => {
            const p = furnIn(i);
            const isConsole = f.furnitureId === FLAGSHIP.consoleId;
            const hot = isConsole && impacted;
            const L = per(f.polygon);
            return (
              <g key={f.furnitureId}>
                <polygon
                  points={pts(f.polygon)}
                  fill={hot ? C.redTint : C.furniture}
                  fillOpacity={prog(t, 1.6 + i * 0.12, 2.5 + i * 0.12)}
                  stroke={hot ? C.red : '#8F938D'}
                  strokeWidth={hot ? 22 : 12}
                  strokeDasharray={L}
                  strokeDashoffset={L * (1 - p)}
                />
                {f.widthMm > 400 ? (
                  <text
                    x={f.center.x}
                    y={-f.center.y + 40}
                    textAnchor="middle"
                    fontFamily={MONO}
                    fontSize={hot ? 130 : 108}
                    fontWeight={hot ? 600 : 500}
                    fill={hot ? C.redInk : '#6A7076'}
                    opacity={prog(t, 2.0 + i * 0.1, 2.7 + i * 0.1)}
                  >
                    {f.furnitureId}
                  </text>
                ) : null}
              </g>
            );
          })}
          {/* Overlap footprint and blocked remainder after the strike */}
          {footprint && impacted ? (
            <polygon
              points={pts(footprint.polygon)}
              fill="url(#hatch)"
              stroke={C.red}
              strokeWidth={16}
              opacity={blockedIn}
            />
          ) : null}
          {/* Ghost of the full 90° swing (what the plan promised) */}
          <polyline
            points={pts(ghostArc)}
            fill="none"
            stroke="#A9ADA7"
            strokeWidth={14}
            strokeDasharray="70 60"
            opacity={ghostIn * doorIn}
          />
          {impacted ? (
            <polyline
              points={pts(arcTo(strikeDeg, 90))}
              fill="none"
              stroke={C.red}
              strokeWidth={16}
              strokeDasharray="70 60"
              opacity={blockedIn}
            />
          ) : null}
          {swept ? (
            <polygon
              points={pts(swept)}
              fill={impacted ? C.red : C.grip}
              fillOpacity={impacted ? 0.16 : 0.12}
            />
          ) : null}
          {swept ? (
            <polyline
              points={pts(arcTo(0, swing))}
              fill="none"
              stroke={impacted ? C.red : C.grip}
              strokeWidth={14}
            />
          ) : null}
          {/* Walls (poché), inked then filled */}
          {room.walls.map((w) => {
            const L = per(w.polygon);
            return (
              <polygon
                key={w.key}
                points={pts(w.polygon)}
                fill={C.ink}
                fillOpacity={wallsFill}
                stroke={C.ink}
                strokeWidth={18}
                strokeDasharray={L}
                strokeDashoffset={L * (1 - wallsInk)}
                strokeLinejoin="miter"
              />
            );
          })}
          {/* Door leaf */}
          <polygon points={pts(leaf)} fill={impacted ? C.red : C.ink} opacity={doorIn} />
          <circle
            cx={door.hinge.x}
            cy={-door.hinge.y}
            r={46}
            fill={C.sheet}
            stroke={C.grip}
            strokeWidth={16}
            opacity={doorIn}
          />
          <text
            x={door.hinge.x + 120}
            y={-door.hinge.y - 220}
            fontFamily={MONO}
            fontSize={118}
            fontWeight={600}
            fill={C.gripInk}
            opacity={doorIn}
          >
            {FLAGSHIP.doorId}
          </text>
          {/* Strike ring */}
          {strike && impacted ? (
            <g opacity={Math.max(blockedIn, flash)}>
              <circle
                cx={strike.point.x}
                cy={-strike.point.y}
                r={60 + 260 * (1 - flash)}
                fill="none"
                stroke={C.red}
                strokeWidth={14 + 40 * flash}
                opacity={0.35 + 0.65 * flash}
              />
              <circle
                cx={strike.point.x}
                cy={-strike.point.y}
                r={52}
                fill={C.sheet}
                stroke={C.red}
                strokeWidth={18}
              />
              <circle cx={strike.point.x} cy={-strike.point.y} r={18} fill={C.red} />
              <text
                x={consoleItem.polygon[1]!.x + 120}
                y={-strike.point.y + 40}
                fontFamily={MONO}
                fontSize={128}
                fontWeight={600}
                fill={C.redInk}
                opacity={blockedIn}
              >
                strike {formatDeg(strikeDeg)}
              </text>
            </g>
          ) : null}
          {/* Revision cloud around the moved door */}
          <path
            d={cloudPath(cloudRect, 150)}
            fill="none"
            stroke={C.red}
            strokeWidth={16}
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - cloudIn}
          />
          <g
            opacity={prog(t, T.cloud + 0.9, T.cloud + 1.3)}
            transform={`translate(${cloudRect.x + cloudRect.width + 40} ${cloudRect.y - 40})`}
          >
            <path d="M0 160 L92 0 L184 160 Z" fill={C.sheet} stroke={C.red} strokeWidth={14} />
            <text
              x={92}
              y={135}
              textAnchor="middle"
              fontFamily={MONO}
              fontSize={96}
              fontWeight={600}
              fill={C.redInk}
            >
              A
            </text>
          </g>
          {/* Room label */}
          <text
            x={60}
            y={-ROOM.depthMm - 300}
            fontFamily={MONO}
            fontSize={120}
            fill="#6A7076"
            opacity={prog(t, 1.2, 2.0)}
            letterSpacing={12}
          >
            R-512 · GUEST ROOM 512
          </text>
          {/* Title block */}
          <g opacity={prog(t, 1.6, 2.6)}>
            <rect
              x={6500}
              y={-1150}
              width={2350}
              height={1400}
              fill={C.sheet}
              stroke={C.ink}
              strokeWidth={14}
            />
            <line x1={6500} x2={8850} y1={-760} y2={-760} stroke={C.rule2} strokeWidth={10} />
            <line x1={6500} x2={8850} y1={-300} y2={-300} stroke={C.rule2} strokeWidth={10} />
            <text x={6600} y={-880} fontFamily={MONO} fontSize={150} fontWeight={600} fill={C.ink}>
              {PLAN_DOC.id}
            </text>
            <text x={8750} y={-880} textAnchor="end" fontFamily={MONO} fontSize={110} fill="#6A7076">
              REV {PLAN_DOC.revision}
            </text>
            <text x={6600} y={-560} fontFamily={SANS} fontSize={104} fontWeight={600} fill={C.ink}>
              Level 5 Floor Plan
            </text>
            <text x={6600} y={-410} fontFamily={SANS} fontSize={92} fill={C.ink2}>
              Guest Rooms 512–513
            </text>
            <text x={6600} y={-120} fontFamily={MONO} fontSize={84} fill="#6A7076">
              Aster House Hotel
            </text>
            <text x={6600} y={60} fontFamily={MONO} fontSize={84} fill="#6A7076">
              {PLAN_DOC.issuedOn}
            </text>
          </g>
          {/* ISSUED stamp */}
          {t >= T.stamp ? (
            <g
              transform={`translate(7680 -360) rotate(-9) scale(${1.7 - 0.7 * stampP})`}
              opacity={Math.min(1, stampP * 1.6) * 0.92}
            >
              <rect
                x={-760}
                y={-260}
                width={1520}
                height={520}
                rx={60}
                fill="none"
                stroke={C.red}
                strokeWidth={30}
              />
              <rect
                x={-700}
                y={-200}
                width={1400}
                height={400}
                rx={36}
                fill="none"
                stroke={C.red}
                strokeWidth={12}
              />
              <text
                x={0}
                y={70}
                textAnchor="middle"
                fontFamily={SANS}
                fontSize={250}
                fontWeight={700}
                letterSpacing={30}
                fill={C.red}
              >
                ISSUED
              </text>
            </g>
          ) : null}
        </svg>
      </div>
      {/* Impact flash */}
      {flash > 0.01 ? <AbsoluteFill style={{ backgroundColor: C.red, opacity: flash * 0.12 }} /> : null}
      {/* Hinge readout, top right: the engine's own numbers as the door slides */}
      <div
        style={{
          position: 'absolute',
          right: 64 * s,
          top: 64 * s,
          fontFamily: MONO,
          fontSize: 34 * s,
          color: C.ink2,
          opacity: prog(t, 2.6, 3.4) * (1 - exit),
          textAlign: 'right',
          lineHeight: 1.5,
        }}
      >
        <div>
          {FLAGSHIP.doorId} hinge{' '}
          <span style={{ color: hingeMm === 1700 ? C.ink : C.redInk, fontWeight: 600 }}>
            {hingeMm.toLocaleString('en-GB')} mm
          </span>
        </div>
        <div style={{ color: impacted ? C.redInk : C.ink3 }}>
          {impacted ? `opens ${formatDeg(maxDeg)} of 90°` : 'swing not checked'}
        </div>
      </div>
    </AbsoluteFill>
  );
}
