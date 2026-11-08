import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, easeIn, easeOut, prog } from '../anim';
import { Clip } from '../components/Clip';
import { EXCERPT, M } from '../data';
import { C, MONO, SANS } from '../theme';

const START = 111.78;
const PW = 640;
const PH = 400;
const CX = 1280;
const CY = 690;
// Two rows of three, numbered clockwise from the top left, so every label sits in open space
// under its own panel and the captions keep the bottom band.
const COL = [510, 1280, 2050];
const ROW = [296, 976];
const SLOT = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [1, 1],
  [0, 1],
] as const;
const pos = (i: number) => ({ x: COL[SLOT[i]![0]]!, y: ROW[SLOT[i]![1]]! });
/** Suture from panel i to panel i+1, edge to edge; vertical ones run right of the labels. */
const link = (i: number) => {
  const a = pos(i);
  const b = pos((i + 1) % 6);
  if (a.y === b.y) {
    const dir = Math.sign(b.x - a.x);
    return { x1: a.x + (dir * PW) / 2, y1: a.y, x2: b.x - (dir * PW) / 2, y2: b.y };
  }
  const dir = Math.sign(b.y - a.y);
  return { x1: a.x + 220, y1: a.y + (dir * PH) / 2, x2: b.x + 220, y2: b.y - (dir * PH) / 2 };
};

interface Panel {
  readonly n: string;
  readonly label: string;
  readonly at: number;
  readonly body: ReactNode;
}

function CodeCard({ w, h }: { w: number; h: number }) {
  const lines = EXCERPT.code.split('\n');
  return (
    <div
      style={{
        width: w,
        height: h,
        background: '#FBFBF9',
        padding: '22px 26px',
        boxSizing: 'border-box',
        fontFamily: MONO,
        fontSize: 17.5,
        lineHeight: 1.55,
        color: C.ink2,
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: 15, color: C.ink3, marginBottom: 8 }}>
        {EXCERPT.file}:{EXCERPT.line}
      </div>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            whiteSpace: 'pre',
            color: /return|if|const|function/.test(l.trim().split(' ')[0] ?? '') ? C.ink : C.ink2,
          }}
        >
          <span style={{ color: '#B6BAB4', marginRight: 16 }}>
            {String(EXCERPT.line + i).padStart(3, ' ')}
          </span>
          {l.replace(/\t/g, '  ')}
        </div>
      ))}
    </div>
  );
}

/** "Under the hood, it's a Frankenstein": six real parts appear on their words and are stitched into one loop. */
export function Stitch() {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = START + frame / fps;
  const s = width / 2560;

  const panels: Panel[] = [
    {
      n: '01',
      label: 'CAD-style editor',
      at: M.cad!,
      body: (
        <Clip
          name="c2-studio"
          at={21.0}
          crop={{ x: 250, y: 58, w: 1190, h: 744 }}
          width={PW}
          height={PH}
          freeze
        />
      ),
    },
    { n: '02', label: 'Geometry engine', at: M.geometry!, body: <CodeCard w={PW} h={PH} /> },
    {
      n: '03',
      label: 'Live 3D room',
      at: M.live3d!,
      body: <Clip name="c1-hero" at={7.6} crop={{ x: 600, y: 90, w: 840, h: 525 }} width={PW} height={PH} />,
    },
    {
      n: '04',
      label: 'Revision control',
      at: M.revisionControl!,
      body: (
        <Clip
          name="c4-decide"
          at={1.8}
          crop={{ x: 20, y: 70, w: 1400, h: 875 }}
          width={PW}
          height={PH}
          freeze
        />
      ),
    },
    {
      n: '05',
      label: 'Document ledger',
      at: M.ledger!,
      body: (
        <Clip
          name="c3-review"
          at={6.3}
          crop={{ x: 40, y: 84, w: 992, h: 620 }}
          width={PW}
          height={PH}
          freeze
        />
      ),
    },
    {
      n: '06',
      label: 'Audit trail',
      at: M.audit!,
      body: (
        <Clip
          name="c4-decide"
          at={10.5}
          crop={{ x: 392, y: 140, w: 656, h: 410 }}
          width={PW}
          height={PH}
          freeze
        />
      ),
    },
  ];

  const stitchT = M.stitched! + 0.08;
  const pulseFrom = M.oneEdit! + 0.25;
  const pulseTo = M.flows! + 1.1;
  const alive = 127.15;
  const exit = prog(t, 129.55, 130.0, easeIn);
  const links = Array.from({ length: 6 }, (_, i) => link(i));
  const pulseP = clamp01((t - pulseFrom) / (pulseTo - pulseFrom));
  const pulseIdx = pulseP * 6;
  // The pulse runs along each suture and passes through the panel between two sutures.
  const dotAt = (p: number) => {
    const i = Math.floor(p) % 6;
    const f = clamp01((p - Math.floor(p) - 0.2) / 0.6);
    const l = links[i]!;
    return { x: l.x1 + (l.x2 - l.x1) * f, y: l.y1 + (l.y2 - l.y1) * f };
  };
  const dot = dotAt(Math.min(5.999, pulseIdx));
  const flicker = t > alive && t < alive + 0.5 ? (Math.sin((t - alive) * 120) > 0 ? 1 : 0.35) : 1;

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `scale(${1 + exit * 0.25})`,
          opacity: 1 - exit,
          transformOrigin: '50% 45%',
        }}
      >
        {/* Sutures between neighbours */}
        <svg
          width={2560 * s}
          height={1440 * s}
          viewBox="0 0 2560 1440"
          style={{ position: 'absolute', inset: 0 }}
        >
          {links.map((l, i) => {
            const p = easeOut(clamp01((t - (stitchT + i * 0.09)) / 0.45));
            if (p <= 0) return null;
            const dx = l.x2 - l.x1;
            const dy = l.y2 - l.y1;
            const len = Math.hypot(dx, dy);
            const ux = dx / len;
            const uy = dy / len;
            const ticks = Math.floor((len * p - 10) / 34);
            const lit = pulseP > 0 && pulseIdx >= i && pulseIdx < i + 1.2;
            const col = t > alive ? C.red : lit ? C.grip : C.ink;
            return (
              <g key={i} opacity={flicker}>
                <line
                  x1={l.x1}
                  y1={l.y1}
                  x2={l.x1 + dx * p}
                  y2={l.y1 + dy * p}
                  stroke={col}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                {Array.from({ length: Math.max(0, ticks) }, (_, k) => {
                  const d = 22 + k * 34;
                  const mx = l.x1 + ux * d;
                  const my = l.y1 + uy * d;
                  // Cross-stitch: a short slanted bar across the seam.
                  return (
                    <line
                      key={k}
                      x1={mx - uy * 15 - ux * 7}
                      y1={my + ux * 15 - uy * 7}
                      x2={mx + uy * 15 + ux * 7}
                      y2={my - ux * 15 + uy * 7}
                      stroke={col}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );
          })}
          {pulseP > 0 && pulseP < 1 ? (
            <g>
              <circle cx={dot.x} cy={dot.y} r={44} fill={C.grip} opacity={0.16} />
              <circle cx={dot.x} cy={dot.y} r={16} fill={C.grip} />
            </g>
          ) : null}
        </svg>
        {/* Panels */}
        {panels.map((p, i) => {
          const c = pos(i);
          const pin = easeOut(clamp01((t - (p.at - 0.05)) / 0.45));
          if (t < p.at - 0.05) return null;
          const lit = pulseP > 0 && pulseP < 1 && Math.abs(pulseIdx - i) < 0.55;
          const border = t > alive ? C.red : lit ? C.grip : C.rule2;
          return (
            <div
              key={p.n}
              style={{
                position: 'absolute',
                left: (c.x - PW / 2) * s,
                top: (c.y - PH / 2) * s,
                width: PW * s,
                transform: `scale(${0.86 + 0.14 * pin})`,
                opacity: pin * flicker,
              }}
            >
              <div
                style={{
                  width: PW,
                  height: PH,
                  transform: `scale(${s})`,
                  transformOrigin: '0 0',
                  borderRadius: 18,
                  overflow: 'hidden',
                  boxShadow: `0 0 0 ${lit || t > alive ? 4 : 2}px ${border}, 0 30px 60px -30px rgba(17,19,21,0.5)`,
                  background: C.sheet,
                }}
              >
                <Sequence from={Math.round((p.at - 0.05 - START) * fps)} layout="none">
                  {p.body}
                </Sequence>
              </div>
              <div
                style={{
                  position: 'absolute',
                  top: (PH + 18) * s,
                  left: 0,
                  display: 'flex',
                  gap: 14 * s,
                  alignItems: 'baseline',
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: 34 * s,
                  color: C.ink,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 26 * s, color: C.red }}>{p.n}</span>
                {p.label}
              </div>
            </div>
          );
        })}
        {/* Centre band between the rows: the claim, then the payoff in the same place */}
        <div
          style={{
            position: 'absolute',
            left: CX * s - 700 * s,
            top: (CY - 40) * s,
            width: 1400 * s,
            textAlign: 'center',
            fontFamily: MONO,
            fontSize: 34 * s,
            color: C.ink2,
            opacity: prog(t, M.oneEdit!, M.oneEdit! + 0.5) * (1 - prog(t, alive - 0.3, alive)),
          }}
        >
          one scene → one analysis → every view
        </div>
        <div
          style={{
            position: 'absolute',
            left: CX * s - 700 * s,
            top: (CY - 80) * s,
            width: 1400 * s,
            textAlign: 'center',
            fontFamily: SANS,
            fontWeight: 650,
            fontSize: 124 * s,
            lineHeight: 1.05,
            letterSpacing: '-0.035em',
            color: C.ink,
            opacity: prog(t, alive + 0.05, alive + 0.35) * flicker,
          }}
        >
          It’s alive.
        </div>
      </div>
    </AbsoluteFill>
  );
}
