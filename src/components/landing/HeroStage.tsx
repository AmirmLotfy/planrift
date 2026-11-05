'use client';

/**
 * Hero and scroll story. One sticky stage holds the white model; scrolling plays four chapters
 * on it, all solved live by the engine (solveAt):
 *   01 Approved   — the visitor drags D-101 (or uses the slider / presets).
 *   02 Revision A — the door slides to 3,000 mm and strikes console F-07; the camera closes in.
 *   03 Drawing    — the camera rises to straight down and the model becomes the plan.
 *   04 Reissue    — Revision B at 2,400 mm clears; the sheets that still change rise beside it.
 * Reduced motion: the stage still follows the scroll position, but each chapter jumps to its
 * final pose (no scrubbing, no damping, no intro). No WebGL: the SVG plan replaces the model.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { createDrive } from '@/components/scene/drive';
import { lerp, progress, smoothstep } from '@/components/scene/motion';
import type { FrameBox } from '@/components/scene/posing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/ui/useBrowser';
import { useMediaQuery } from '@/components/workspace/useMediaQuery';
import { doorAnalysis, pairsForDoor, type PairStatus } from '@/domain/analysis/analyze';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { statusStroke } from '@/render/palette';
import { buildPlanModel, cropForRooms, fitCropToAspect } from '@/render/planModel';
import { scrollToY } from './LandingMotion';
import { BASELINE, headlineFor, hingeMap, solveAt, type Frame } from './engine';
import { useHeroModel } from './heroState';
import css from './heroStage.module.css';

const WhiteModel = dynamic(() => import('@/components/scene/WhiteModel'), { ssr: false, loading: () => null });

const { doorId: DOOR, consoleId: CONSOLE, baselineHingeMm: APPROVED, revisionAHingeMm: REV_A, revisionBHingeMm: REV_B } = FLAGSHIP;

/** Story timeline, as fractions of the sticky track. */
const T = {
  ch1: 0.14,
  ch2: 0.42,
  /** Chapter 03 copy leaves here; the drawing slides left with no copy over it until 04. */
  gap: 0.64,
  ch3: 0.74,
  camDoor: [0.12, 0.34],
  revise: [0.16, 0.38],
  plan: [0.44, 0.6],
  morph: [0.48, 0.62],
  shift: [0.64, 0.74],
  fix: [0.76, 0.88],
} as const;

const CHAPTERS = [
  { n: '01', label: 'Approved' },
  { n: '02', label: 'Revision A' },
  { n: '03', label: 'Drawing' },
  { n: '04', label: 'Reissue' },
] as const;

const FRAMES: Record<'wide' | 'narrow', readonly [FrameBox, FrameBox]> = {
  wide: [
    { left: 0.36, right: 1, top: 0.1, bottom: 0.94 },
    { left: 0.02, right: 0.56, top: 0.13, bottom: 0.76 },
  ],
  narrow: [
    // Phones: the canvas is only the top 48 % of the stage (CSS), below the floating header.
    { left: 0, right: 1, top: 0.17, bottom: 0.97 },
    { left: 0, right: 1, top: 0.17, bottom: 0.97 },
  ],
};

const mixFrame = (a: FrameBox, b: FrameBox, t: number): FrameBox => ({
  left: lerp(a.left, b.left, t),
  right: lerp(a.right, b.right, t),
  top: lerp(a.top, b.top, t),
  bottom: lerp(a.bottom, b.bottom, t),
});

const PRESETS = [
  { label: 'Approved', mm: APPROVED },
  { label: 'Rev A', mm: REV_A },
  { label: 'Rev B', mm: REV_B },
] as const;

/** Floating header height plus breathing room, in CSS px. */
const HEADER_CLEARANCE_PX = 78;
const NARROW_QUERY = '(max-width: 760px), (max-aspect-ratio: 4/5)';
const WALL_MM = BASELINE.rooms[0]!.widthMm;
const LEAF_MM = BASELINE.rooms[0]!.doors[0]!.leafWidthMm;
/** Hinge offsets where the leaf fits on the wall (the drag range of the plan model). */
const RANGE: readonly [number, number] = [0, WALL_MM - LEAF_MM];

function chapterAt(p: number): number {
  return p < T.ch1 ? 0 : p < T.ch2 ? 1 : p < T.ch3 ? 2 : 3;
}

interface Readout {
  readonly status: PairStatus;
  readonly openingDeg: number;
  readonly console: { readonly mm: number; readonly status: PairStatus } | null;
  readonly sheets: number;
  readonly headline: string;
}

function readout(frame: Frame): Readout {
  const door = doorAnalysis(frame.analysis, DOOR)!;
  const pair = pairsForDoor(frame.analysis, DOOR).find((p) => p.furnitureId === CONSOLE);
  return {
    status: door.status,
    openingDeg: door.validity === 'VALID' ? (door.maxOpeningDeg ?? 90) : 0,
    console: pair?.separation ? { mm: pair.separation.valueMm, status: pair.status } : null,
    sheets: frame.impacts.length,
    headline: headlineFor(frame),
  };
}

const consoleText = (c: Readout['console']) => (!c ? '—' : c.mm < 0 ? `${formatMeasure(-c.mm)} into` : `${formatMeasure(c.mm)} clear`);

/* ------------------------------------------------------------------ sheets (chapter 04) */

function ElevationMini({ frame }: { frame: Frame }) {
  const room = frame.scene.rooms[0]!;
  const door = room.doors[0]!;
  const W = room.widthMm;
  const H = room.heightMm;
  const x0 = door.leafDirection === 'toward-end' ? door.hingeOffsetMm : door.hingeOffsetMm - door.leafWidthMm;
  const k = 200 / W;
  return (
    <svg viewBox="-10 -14 220 120" className={css.mini} aria-hidden="true">
      <rect x={0} y={0} width={W * k} height={H * k} fill="none" stroke="currentColor" strokeWidth={1.2} />
      <rect x={x0 * k} y={(H - door.heightMm) * k} width={door.leafWidthMm * k} height={door.heightMm * k} className={css.miniChange} />
      <line x1={0} x2={x0 * k} y1={H * k + 8} y2={H * k + 8} stroke="currentColor" strokeWidth={0.8} />
      <text x={(x0 * k) / 2} y={H * k + 20} textAnchor="middle" className={css.miniText}>
        {formatMm(door.hingeOffsetMm).replace(' mm', '')}
      </text>
    </svg>
  );
}

function ScheduleMini({ frame }: { frame: Frame }) {
  const rows = frame.scene.rooms.flatMap((r) => r.doors.map((d) => ({ id: d.id, size: `${d.leafWidthMm} × ${d.heightMm}`, hinge: d.hingeOffsetMm })));
  return (
    <svg viewBox="0 0 220 104" className={css.mini} aria-hidden="true">
      {['Door', 'Leaf', 'Hinge'].map((h, i) => (
        <text key={h} x={8 + i * 72} y={16} className={css.miniHead}>
          {h}
        </text>
      ))}
      <line x1={0} x2={220} y1={24} y2={24} stroke="currentColor" strokeWidth={1} />
      {rows.map((r, i) => {
        const changed = r.id === DOOR;
        return (
          <g key={r.id} transform={`translate(0 ${42 + i * 24})`}>
            {changed ? <rect x={0} y={-14} width={220} height={20} className={css.miniChange} /> : null}
            <text x={8} y={0} className={css.miniText}>
              {r.id}
            </text>
            <text x={80} y={0} className={css.miniText}>
              {r.size}
            </text>
            <text x={152} y={0} className={css.miniText}>
              {formatMm(r.hinge).replace(' mm', '')}
            </text>
            <line x1={0} x2={220} y1={10} y2={10} stroke="currentColor" strokeWidth={0.5} opacity={0.4} />
          </g>
        );
      })}
    </svg>
  );
}

function Sheets({ active, reduced }: { active: boolean; reduced: boolean }) {
  const frame = solveAt(REV_B);
  const plan = useMemo(() => buildPlanModel(frame.scene, frame.analysis, { selectedId: DOOR }), [frame]);
  const crop = useMemo(() => fitCropToAspect(cropForRooms(plan, [FLAGSHIP.roomId, FLAGSHIP.otherRoomId], { west: 300, east: 300, south: 300, north: 300 }), 220 / 104), [plan]);
  const documents = new Map(BASELINE.documents.map((d) => [d.id, d]));
  const untouched = BASELINE.documents.filter((d) => !frame.impacts.some((i) => i.documentId === d.id));
  return (
    <div className={css.sheets} data-active={active || undefined} data-reduced={reduced || undefined}>
      {frame.impacts.map((impact, i) => {
        const doc = documents.get(impact.documentId)!;
        const view = doc.kind === 'schedule' ? 'schedule' : /elevation/i.test(doc.title) ? 'elevation' : 'plan';
        return (
          <article key={impact.documentId} className={css.sheet} style={{ '--i': i } as CSSProperties}>
            <div className={css.sheetArt}>
              {view === 'plan' ? (
                <PlanDrawing model={plan} crop={crop} mode="thumbnail" focusDoorId={DOOR} renderWidthPx={220} title={`${doc.id} miniature`} />
              ) : view === 'elevation' ? (
                <ElevationMini frame={frame} />
              ) : (
                <ScheduleMini frame={frame} />
              )}
            </div>
            <div className={css.sheetBlock}>
              <span className={css.sheetId}>{doc.id}</span>
              <span className={css.sheetRev}>Rev {doc.revision}</span>
              <p className={css.sheetTitle}>{doc.title}</p>
              <p className={css.sheetFlag}>
                <mark>Review required</mark>
              </p>
              <p className={css.sheetWhy}>{impact.reasons[0]?.linkNote}</p>
            </div>
          </article>
        );
      })}
      {untouched.length ? (
        <p className={css.untouched}>
          {untouched.map((d) => d.id).join(', ')} {untouched.length === 1 ? 'shows' : 'show'} nothing that moved: not flagged.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ instrument */

function Instrument({
  hinge,
  read,
  onChange,
  scripted,
}: {
  hinge: number;
  read: Readout;
  onChange: (mm: number) => void;
  scripted: boolean;
}) {
  const map = hingeMap();
  return (
    <div className={css.instrument} data-status={read.status}>
      <div className={css.instHead}>
        <label htmlFor="hero-hinge" className={css.instLabel}>
          <span className={css.instId}>{DOOR}</span> hinge from the west corner
        </label>
        <output htmlFor="hero-hinge" className={css.instValue}>
          {formatMm(hinge)}
        </output>
        <span key={read.status} className={css.instBadge}>
          <StatusBadge status={read.status} size="sm" />
        </span>
      </div>
      <div className={css.track}>
        <div className={css.bands} aria-hidden="true">
          {map.segments.map((s) => (
            <span
              key={s.fromMm}
              className={css.band}
              data-status={s.status}
              style={{ left: `${(s.fromMm / WALL_MM) * 100}%`, width: `${((s.toMm - s.fromMm + 1) / WALL_MM) * 100}%`, background: statusStroke[s.status] }}
            />
          ))}
        </div>
        <input
          id="hero-hinge"
          type="range"
          className={css.range}
          min={RANGE[0]}
          max={RANGE[1]}
          step={10}
          value={hinge}
          style={{ width: `${(RANGE[1] / WALL_MM) * 100}%` }}
          aria-valuetext={`${formatMm(hinge)}, ${STATUS_LABEL[read.status]}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </div>
      <div className={css.instFoot}>
        <div className={css.presets} role="group" aria-label="Positions from the sample project">
          {PRESETS.map((p) => (
            <button key={p.mm} type="button" aria-pressed={hinge === p.mm} onClick={() => onChange(p.mm)}>
              {p.label} <span className={css.presetMm}>{formatMm(p.mm).replace(' mm', '')}</span>
            </button>
          ))}
        </div>
        <dl className={css.readouts}>
          <div>
            <dt>Opens</dt>
            <dd>{formatDeg(read.openingDeg)}</dd>
          </div>
          <div data-status={read.console?.status}>
            <dt>{CONSOLE}</dt>
            <dd>{consoleText(read.console)}</dd>
          </div>
          <div data-flag={read.sheets > 0 || undefined}>
            <dt>Sheets</dt>
            <dd>{read.sheets}</dd>
          </div>
        </dl>
      </div>
      {scripted ? <p className={css.scripted}>The scroll is moving the door. Drag or use the slider to take over.</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ stage */

export function HeroStage() {
  const section = useRef<HTMLElement>(null);
  const canvasBox = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const webgl = useWebGLSupport();
  const drive = useMemo(() => createDrive({ from: 'hero', to: 'hero', frame: FRAMES.wide[0] }), []);
  const [userHinge, setUserHinge] = useState<number>(APPROVED);
  const [override, setOverride] = useState<{ mm: number; p: number } | null>(null);
  const [chapter, setChapter] = useState(0);
  const [between, setBetween] = useState(false);
  const [scripted, setScripted] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);
  // Portrait phones frame the model in the top half of the stage (matches the CSS query).
  const narrow = useMediaQuery(NARROW_QUERY);
  const live = useRef({ userHinge, reduced, narrow, p: 0 });
  useLayoutEffect(() => {
    live.current = { ...live.current, userHinge, reduced, narrow };
  });

  // Scroll → story. Camera and morph go straight to the drive; React only hears about the
  // chapter and the scripted hinge (10 mm steps).
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const p = Math.min(1, Math.max(0, -rect.top / total));
      const { userHinge: start, reduced: jump, narrow: small } = live.current;
      live.current.p = p;
      const q = (range: readonly [number, number]) => (jump ? (p >= (range[0] + range[1]) / 2 ? 1 : 0) : smoothstep(progress(p, range[0], range[1])));
      const tDoor = q(T.camDoor);
      const tPlan = q(T.plan);
      // Phones: keep the model below the floating header whatever the canvas height is.
      const below = small ? Math.min(0.4, HEADER_CLEARANCE_PX / Math.max(1, canvasBox.current?.clientHeight ?? 400)) : 0;
      const frames = FRAMES[small ? 'narrow' : 'wide'].map((f) => (small ? { ...f, top: below } : f)) as unknown as readonly [FrameBox, FrameBox];
      drive.set({
        from: tPlan > 0 ? 'door' : 'hero',
        to: tPlan > 0 ? 'plan' : 'door',
        t: tPlan > 0 ? tPlan : tDoor,
        morph: q(T.morph),
        frame: mixFrame(frames[0], frames[1], q(T.shift)),
      });
      const ch = chapterAt(p);
      setChapter(ch);
      setBetween(p >= T.gap && p < T.ch3);
      setScripted(ch === 0 ? null : Math.round(lerp(lerp(start, REV_A, q(T.revise)), REV_B, q(T.fix)) / 10) * 10);
      setOverride((o) => (o && Math.abs(p - o.p) > 0.015 ? null : o));
    };
    const request = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, [drive, narrow, reduced]);

  const hinge = override?.mm ?? scripted ?? userHinge;
  const frame = solveAt(hinge);
  const read = readout(frame);
  const setHero = useHeroModel((s) => s.set);
  useEffect(() => {
    setHero({ hingeMm: hinge, status: read.status, headline: read.headline, documentsToReview: read.sheets });
  }, [hinge, read.status, read.headline, read.sheets, setHero]);

  const take = (mm: number) => {
    setTouched(true);
    if (chapterAt(live.current.p) === 0) {
      setUserHinge(mm);
      setOverride(null);
    } else setOverride({ mm, p: live.current.p });
  };

  const goTo = (index: number) => {
    const el = section.current;
    if (!el) return;
    const starts = [0, T.ch1 + 0.02, T.morph[1], T.fix[1] + 0.02];
    const total = el.offsetHeight - window.innerHeight;
    scrollToY(el.offsetTop + total * starts[index]!);
  };

  const a = readout(solveAt(REV_A));
  const b = readout(solveAt(REV_B));
  const strikeA = solveAt(REV_A);
  const overlapMm2 = pairsForDoor(strikeA.analysis, DOOR).find((p) => p.furnitureId === CONSOLE)?.overlapAreaMm2 ?? 0;
  const manual = chapter === 0 || override !== null;

  return (
    <section ref={section} id="model" className={css.stage} aria-labelledby="hero-title" data-chapter={chapter}>
      <div className={css.sticky}>
        <div ref={canvasBox} className={css.canvas}>
          {webgl === false ? (
            <PlanFallback hinge={hinge} />
          ) : webgl ? (
            <WhiteModel
              scene={frame.scene}
              analysis={frame.analysis}
              focusRoomId={FLAGSHIP.roomId}
              doorId={DOOR}
              drive={drive}
              hingeMap={hingeMap()}
              interactive
              intro
              hint={!touched && chapter === 0}
              quality={narrow ? 'low' : 'high'}
              onHingeChange={take}
              ariaLabel={`White study model of ${FLAGSHIP.roomId}: door ${DOOR} at ${formatMm(hinge)}. ${read.headline}`}
            />
          ) : null}
        </div>

        <div className={css.overlay}>
          <div className={css.copy}>
            <div className={css.chapter} data-active={chapter === 0 || undefined}>
              <p className={css.kicker}>Architecture revision consequence studio</p>
              <h1 id="hero-title" className={css.display}>
                Know what a revision breaks before it’s issued.
              </h1>
              <p className={css.dek}>
                PLANRIFT checks every door swing against the furniture in whole millimetres and lists the drawings that must be reissued. Drag door {DOOR} along
                the wall to try it.
              </p>
              <div className={css.actions}>
                <Link href="/demo" className={css.primary} tabIndex={chapter === 0 ? undefined : -1}>
                  Open the studio <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
                </Link>
                <button type="button" className={css.secondary} onClick={() => goTo(1)} tabIndex={chapter === 0 ? undefined : -1}>
                  Watch a revision <ArrowDown size={15} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className={css.chapter} data-active={chapter === 1 || undefined}>
              <p className={css.kicker}>Revision A</p>
              <h2 className={css.title}>
                Move the door {formatMm(REV_A - APPROVED)} east and the leaf hits the console.
              </h2>
              <p className={css.body}>
                At {formatMm(REV_A)} the swing reaches console {CONSOLE} after <b>{formatDeg(a.openingDeg)}</b>. The leaf would push{' '}
                <b>{a.console ? formatMeasure(-a.console.mm) : '—'}</b> into it, over {(overlapMm2 / 1_000_000).toFixed(3)} m² of its top.
              </p>
            </div>

            <div className={css.chapter} data-active={(chapter === 2 && !between) || undefined}>
              <p className={css.kicker}>Same numbers, drawn</p>
              <h2 className={css.title}>The model is the drawing.</h2>
              <p className={css.body}>
                Plan and 3D are built from one scene, so they cannot disagree. The colours along the wall are the hinge map: the result at every millimetre the
                door could sit.
              </p>
            </div>

            <div className={css.chapter} data-active={chapter === 3 || undefined} data-side="end">
              <p className={css.kicker}>Revision B</p>
              <h2 className={css.title}>
                It fits at {formatMm(REV_B)}. {b.sheets} sheets still change.
              </h2>
              <p className={css.body}>
                The swing clears {CONSOLE} by <b>{b.console ? formatMeasure(b.console.mm) : '—'}</b>. Every drawing that shows the door is flagged for a person to
                reissue; PLANRIFT never edits them.
              </p>
              <Sheets active={chapter === 3} reduced={reduced} />
            </div>
          </div>

          <div className={css.bottom}>
            <Instrument hinge={hinge} read={read} onChange={take} scripted={!manual} />
            <nav className={css.rail} aria-label="Story chapters">
              <ol>
                {CHAPTERS.map((c, i) => (
                  <li key={c.n}>
                    <button type="button" aria-current={chapter === i ? 'step' : undefined} onClick={() => goTo(i)}>
                      <span className={css.railN}>{c.n}</span>
                      <span className={css.railLabel}>{c.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          <p className="visually-hidden" aria-live="polite">
            {manual ? `${DOOR} at ${formatMm(hinge)}: ${STATUS_LABEL[read.status]}. ${read.headline}` : ''}
          </p>
        </div>
      </div>
    </section>
  );
}

function PlanFallback({ hinge }: { hinge: number }) {
  const frame = solveAt(hinge);
  const model = buildPlanModel(frame.scene, frame.analysis, { selectedId: DOOR, hingeMaps: new Map([[DOOR, hingeMap()]]) });
  const crop = cropForRooms(model, [FLAGSHIP.roomId]);
  return (
    <div className={css.fallback}>
      <PlanDrawing model={model} crop={crop} mode="static" focusDoorId={DOOR} title={`Plan of ${FLAGSHIP.roomId}`} description={headlineFor(frame)} />
    </div>
  );
}
