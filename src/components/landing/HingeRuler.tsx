'use client';

/**
 * "Where can the door go?" — D-101's hinge map drawn to scale under a live plan of R-512.
 * Band boundaries come from hingeMap(); the plan, status and sentence come from solveAt() at the
 * cursor. The strip is a keyboard slider; pointer hover/drag scrubs it.
 */

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { RevealTitle } from '@/components/site/RevealTitle';
import { StatusBadge, StatusIcon } from '@/components/ui/StatusBadge';
import { doorAnalysis, pairsForDoor, type PairStatus } from '@/domain/analysis/analyze';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { buildPlanModel, type PlanBounds, type PlanModel } from '@/render/planModel';
import { headlineFor, hingeMap, solveAt } from './engine';
import { useElementSize } from './useElementWidth';
import css from './hingeRuler.module.css';
import s from './sections.module.css';

const SWEEP_MS = 2400;
const SETTLE_MS = 760;
const SNAP_PX = 5;
const LABEL_STEP = 44;
/** Strip geometry (px): value pill, ruler, band track, boundary labels. */
const Y = { pill: 0, pillH: 20, tickBase: 31, track: 33, trackH: 18, leaderTop: 54, leaderMid: 64, label: 82, height: 92 } as const;
/** Band thickness grows with severity, so the strip reads without colour. */
const BAND_H: Record<PairStatus, number> = { PASS: 6, NEAR_CLEARANCE: 10, CONTACT_REVIEW: 14, CONFLICT: 18, INVALID: 18, UNSUPPORTED: 10 };

const clampTo = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const easeInOut = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** "2,803 mm" → "2,803". */
const num = (mm: number) => formatMm(mm).replace(/\s*mm$/, '');

/** Crop around R-512: the south half on wide screens (the swing zone), the whole room on phones. */
function rulerCrop(model: PlanModel, wholeRoom: boolean): PlanBounds {
  const room = model.rooms.find((r) => r.roomId === FLAGSHIP.roomId)!;
  const door = room.doors.find((d) => d.doorId === FLAGSHIP.doorId)!;
  const xs = room.walls.flatMap((w) => w.polygon.map((p) => p.x));
  const ys = room.walls.flatMap((w) => w.polygon.map((p) => p.y));
  const leaf = door.leafWidthMm;
  return {
    minX: Math.min(...xs) - leaf * 0.6,
    maxX: Math.max(...xs) + leaf * 0.6,
    minY: Math.min(...ys) - leaf * 0.32,
    maxY: wholeRoom ? Math.max(...ys) + leaf * 0.2 : door.hinge.y + leaf * 2.06,
  };
}

/** Label centres at least `step` apart; overlapping neighbours form clusters centred on their anchors. */
function spreadLabels(anchors: readonly number[], step: number, lo: number, hi: number): number[] {
  const clusters = anchors.map((a) => ({ count: 1, sum: a }));
  const startOf = (c: { count: number; sum: number }) => clampTo(c.sum / c.count - ((c.count - 1) * step) / 2, lo, hi - (c.count - 1) * step);
  for (let i = 0; i + 1 < clusters.length; ) {
    const a = clusters[i]!;
    const b = clusters[i + 1]!;
    if (startOf(b) - (startOf(a) + (a.count - 1) * step) < step) {
      clusters.splice(i, 2, { count: a.count + b.count, sum: a.sum + b.sum });
      i = Math.max(0, i - 1);
    } else i += 1;
  }
  return clusters.flatMap((c) => Array.from({ length: c.count }, (_, k) => startOf(c) + k * step));
}

type Phase = 'idle' | 'sweep' | 'done';

export function HingeRuler() {
  const map = hingeMap();
  const wall = map.wallLengthMm;
  const segments = map.segments;
  const rest = segments.find((seg) => seg.status === 'CONFLICT')?.fromMm ?? FLAGSHIP.revisionAHingeMm;
  const boundaries = useMemo(() => segments.slice(1).map((seg) => seg.fromMm), [segments]);
  const stops = useMemo(() => [0, ...boundaries, wall], [boundaries, wall]);

  const [mm, setMm] = useState(rest);
  const [paint, setPaint] = useState(wall);
  const [phase, setPhase] = useState<Phase>('idle');
  const [announcement, setAnnouncement] = useState('');
  const [frameRef, size] = useElementSize<HTMLDivElement>({ width: 1344, height: 0 });
  const stripRef = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const dragging = useRef(false);
  const touched = useRef(false);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const width = Math.max(240, size.width);
  const wholeRoom = width < 640;
  const baseline = useMemo(() => {
    const f = solveAt(FLAGSHIP.baselineHingeMm);
    return buildPlanModel(f.scene, f.analysis);
  }, []);
  const crop = useMemo(() => rulerCrop(baseline, wholeRoom), [baseline, wholeRoom]);
  const cropW = crop.maxX - crop.minX;
  const cropH = crop.maxY - crop.minY;
  const xPx = (value: number) => ((value - crop.minX) / cropW) * width;
  const x0 = xPx(0);
  const x1 = xPx(wall);
  const planH = (width * cropH) / cropW;
  const hingeY = baseline.rooms[0]!.doors[0]!.hinge.y;
  const hingeTop = ((crop.maxY - hingeY) / cropH) * planH;

  const frame = solveAt(mm);
  const model = useMemo(() => buildPlanModel(frame.scene, frame.analysis), [frame]);
  const door = doorAnalysis(frame.analysis, FLAGSHIP.doorId)!;
  const sceneDoor = frame.scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!.doors.find((d) => d.id === FLAGSHIP.doorId)!;
  const governing = useMemo(
    () =>
      pairsForDoor(frame.analysis, FLAGSHIP.doorId)
        .filter((p) => p.separation)
        .sort((a, b) => a.separation!.valueMm - b.separation!.valueMm)[0] ?? null,
    [frame],
  );
  const headline = headlineFor(frame);
  const current = segments.find((seg) => mm >= seg.fromMm && mm <= seg.toMm) ?? segments[segments.length - 1]!;
  const labelXs = spreadLabels(boundaries.map(xPx), LABEL_STEP, 22, width - 22);
  const valueText = `${formatMm(mm)}: ${STATUS_LABEL[door.status]}. ${headline}`;

  // Auto-sweep once, the first time the strip is in view (never under reduced motion).
  useEffect(() => {
    const el = stripRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const run = () => {
      const t0 = performance.now();
      setPhase('sweep');
      const tick = (now: number) => {
        const t = now - t0;
        if (t < SWEEP_MS) {
          const v = Math.round((easeInOut(t / SWEEP_MS) * wall) / 5) * 5;
          setMm(v);
          setPaint(v);
          raf.current = requestAnimationFrame(tick);
        } else if (t < SWEEP_MS + SETTLE_MS) {
          setPaint(wall);
          setMm(Math.round(wall + (rest - wall) * easeOut((t - SWEEP_MS) / SETTLE_MS)));
          raf.current = requestAnimationFrame(tick);
        } else {
          raf.current = 0;
          setMm(rest);
          setPhase('done');
        }
      };
      raf.current = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (!touched.current) run();
      },
      { threshold: 0.75 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf.current);
    };
  }, [rest, wall]);

  /** The visitor takes over: stop the sweep and show every band. */
  const takeOver = () => {
    touched.current = true;
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
    if (phase !== 'done') {
      setPhase('done');
      setPaint(wall);
    }
  };

  const fromPointer = (clientX: number) => {
    const el = stripRef.current;
    if (!el) return mm;
    const rect = el.getBoundingClientRect();
    const pxPerMm = rect.width / cropW;
    let value = crop.minX + (clientX - rect.left) / pxPerMm;
    const near = boundaries.find((b) => Math.abs(b - value) * pxPerMm <= SNAP_PX);
    if (near !== undefined) value = near;
    return clampTo(Math.round(value), 0, wall);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    takeOver();
    setMm(fromPointer(e.clientX));
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' && !dragging.current) return;
    takeOver();
    setMm(fromPointer(e.clientX));
  };
  const onPointerEnd = () => {
    if (!dragging.current) return;
    dragging.current = false;
    setAnnouncement(`${FLAGSHIP.doorId} at ${valueText}`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 100 : e.altKey ? 1 : 10;
    let next: number | null = null;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = mm - step;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = mm + step;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = wall;
    else if (e.key === 'PageUp') next = stops.find((v) => v > mm) ?? wall;
    else if (e.key === 'PageDown') next = [...stops].reverse().find((v) => v < mm) ?? 0;
    if (next === null) return;
    e.preventDefault();
    takeOver();
    setMm(clampTo(next, 0, wall));
  };

  const jumpTo = (value: number) => {
    takeOver();
    setMm(value);
    setAnnouncement(`${FLAGSHIP.doorId} at ${formatMm(value)}`);
  };

  const cursorX = xPx(mm);
  const paintX = phase === 'sweep' ? xPx(paint) : x1;
  const separation = governing?.separation?.valueMm ?? null;
  const pillW = 74;
  const pillX = clampTo(cursorX - pillW / 2, 0, width - pillW);
  const ids = { near: `n${uid}`, conflict: `c${uid}`, invalid: `i${uid}`, clip: `k${uid}` };
  /** Pattern fills (hatch / stripes) for the statuses that need more than a flat colour. */
  const bandFill = (status: PairStatus) =>
    status === 'NEAR_CLEARANCE' ? `url(#${ids.near})` : status === 'CONFLICT' ? `url(#${ids.conflict})` : status === 'INVALID' ? `url(#${ids.invalid})` : undefined;
  const room = frame.scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!;

  return (
    <section id="fit" className={s.section} aria-labelledby="fit-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={`${s.head} ${css.head}`}>
          <div className={css.intro}>
            <RevealTitle id="fit-title" className={s.title} lines={['Where can the door go?']} />
            <p className={s.dek} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
              {FLAGSHIP.doorId} can sit anywhere on the {formatMm(wall)} south wall of {room.id}. Every millimetre was solved; move along the strip and the plan
              above is recomputed at each position.
            </p>
          </div>
          <div className={css.readout} data-status={door.status} data-reveal="" style={{ '--i': 2 } as CSSProperties}>
            <div className={css.readTop}>
              <span className={s.micro}>{FLAGSHIP.doorId} · hinge from west corner</span>
              <StatusBadge status={door.status} />
            </div>
            <p className={css.readValue}>
              <span className={s.mono}>{num(mm)}</span>
              <span className={css.readUnit}>mm</span>
            </p>
            <p className={css.readSentence}>{headline}</p>
            <dl className={css.facts}>
              <div>
                <dt>Door opens</dt>
                <dd className={s.mono}>{door.maxOpeningDeg === null ? '—' : `${formatDeg(door.maxOpeningDeg)} of ${sceneDoor.swingDeg}°`}</dd>
              </div>
              <div>
                <dt>{governing && separation !== null ? `${separation < 0 ? 'Intrusion into' : 'Clearance to'} ${governing.furnitureId}` : 'Clearance'}</dt>
                <dd className={s.mono}>{separation === null ? 'Not evaluated' : formatMeasure(Math.abs(separation))}</dd>
              </div>
              <div>
                <dt>Drawings to review</dt>
                <dd className={`${s.mono} ${css.ids}`}>
                  {frame.impacts.length
                    ? frame.impacts.map((i, k) => (
                        <span key={i.documentId}>
                          {k ? ' · ' : ''}
                          {i.documentId}
                        </span>
                      ))
                    : 'None'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div ref={frameRef} className={css.instrument} data-phase={phase} data-status={door.status} data-reveal="fade">
          <div className={css.planHead} aria-hidden="true">
            <span className={s.micro}>
              {room.id} · {room.name.toUpperCase()}
            </span>
            <span className={s.micro}>PLAN AND STRIP SHARE ONE SCALE</span>
          </div>
          <div className={css.plan} style={{ aspectRatio: `${cropW} / ${cropH}` }}>
            <PlanDrawing
              model={model}
              crop={crop}
              mode="static"
              focusDoorId={FLAGSHIP.doorId}
              renderWidthPx={width}
              dimRoomIds={[FLAGSHIP.otherRoomId]}
              showDimensions={false}
              title={`${room.id} plan with ${FLAGSHIP.doorId} hinged at ${formatMm(mm)}`}
              description={headline}
            />
            <div className={css.projection} aria-hidden="true" style={{ left: cursorX, top: hingeTop, height: planH - hingeTop }}>
              <span className={css.hingeDot} />
            </div>
          </div>

          <div
            ref={stripRef}
            className={css.strip}
            role="slider"
            tabIndex={0}
            aria-label={`${FLAGSHIP.doorId} hinge position along the ${formatMm(wall)} south wall`}
            aria-valuemin={0}
            aria-valuemax={wall}
            aria-valuenow={mm}
            aria-valuetext={valueText}
            aria-orientation="horizontal"
            aria-describedby={`${uid}-hint`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            style={{ height: Y.height }}
          >
            <svg width="100%" height={Y.height} viewBox={`0 0 ${width} ${Y.height}`} aria-hidden="true" className={css.stripSvg}>
              <defs>
                <pattern id={ids.near} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width={6} height={6} className={css.fillAmberTint} />
                  <line x1={0} y1={0} x2={0} y2={6} className={css.strokeAmber} strokeWidth={3} />
                </pattern>
                <pattern id={ids.conflict} width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <rect width={7} height={7} className={css.fillRedline} />
                  <line x1={0} y1={0} x2={0} y2={7} className={css.strokeSheet} strokeWidth={1.2} />
                </pattern>
                <pattern id={ids.invalid} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
                  <rect width={6} height={6} className={css.fillSheet} />
                  <line x1={0} y1={0} x2={0} y2={6} className={css.strokeInk} strokeWidth={1.4} />
                </pattern>
                <clipPath id={ids.clip}>
                  <rect x={x0 - 4} y={0} width={Math.max(0, paintX - x0 + 4)} height={Y.height} />
                </clipPath>
              </defs>

              {/* Ruler: minor ticks every 100 mm, labelled every 1,000 mm. */}
              <g className={css.ruler}>
                {Array.from({ length: Math.floor(wall / 100) + 1 }, (_, k) => {
                  const v = k * 100;
                  const major = v % 1000 === 0;
                  const h = major ? 8 : v % 500 === 0 ? 5 : 3;
                  return <line key={v} x1={xPx(v)} x2={xPx(v)} y1={Y.tickBase - h} y2={Y.tickBase} className={major ? css.tickMajor : css.tick} />;
                })}
                {Array.from({ length: Math.floor(wall / 1000) + 1 }, (_, k) => {
                  const v = k * 1000;
                  const x = xPx(v);
                  const hidden = Math.abs(x - cursorX) < pillW / 2 + 22 && phase !== 'idle';
                  return (
                    <text key={v} x={x} y={Y.pill + 14} textAnchor="middle" className={css.rulerLabel} data-hidden={hidden || undefined}>
                      {v === wall ? `${num(v)} mm` : num(v)}
                    </text>
                  );
                })}
              </g>

              <line x1={x0} x2={x1} y1={Y.track + Y.trackH / 2} y2={Y.track + Y.trackH / 2} className={css.baseline} />

              <g className={css.bands} clipPath={phase === 'sweep' ? `url(#${ids.clip})` : undefined}>
                {segments.map((seg) => {
                  const end = seg.toMm < wall ? seg.toMm + 1 : wall;
                  const a = xPx(seg.fromMm);
                  const w = Math.max(xPx(end) - a, 3);
                  const h = BAND_H[seg.status];
                  const cx = (a + xPx(end)) / 2;
                  return (
                    <rect
                      key={`${seg.fromMm}-${seg.status}`}
                      x={cx - w / 2}
                      y={Y.track + (Y.trackH - h) / 2}
                      width={w}
                      height={h}
                      className={css.band}
                      data-status={seg.status}
                      fill={bandFill(seg.status)}
                    />
                  );
                })}
              </g>

              {/* Exact boundary values with leaders to the strip. */}
              <g className={css.boundaries}>
                {boundaries.map((b, k) => {
                  const ax = xPx(b);
                  const lx = labelXs[k]!;
                  const shown = phase !== 'sweep' || paint >= b;
                  return (
                    <g key={b} data-shown={shown || undefined} className={css.boundary}>
                      <path d={`M${ax} ${Y.leaderTop} V${Y.leaderMid - 4} L${lx} ${Y.leaderMid + 4} V${Y.label - 11}`} className={css.leader} />
                      <text x={lx} y={Y.label} textAnchor="middle" className={css.boundaryLabel}>
                        {num(b)}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Cursor: value pill, line and handle. */}
              <g className={css.cursor}>
                <line x1={cursorX} x2={cursorX} y1={Y.pillH} y2={Y.track + Y.trackH + 3} className={css.cursorLine} />
                <rect x={pillX} y={Y.pill} width={pillW} height={Y.pillH} rx={5} className={css.pill} />
                <text x={pillX + pillW / 2} y={Y.pill + 14} textAnchor="middle" className={css.pillText}>
                  {formatMm(mm)}
                </text>
                <circle cx={cursorX} cy={Y.track + Y.trackH / 2} r={7} className={css.handle} />
                <circle cx={cursorX} cy={Y.track + Y.trackH / 2} r={2.4} className={css.handleDot} />
              </g>
            </svg>
          </div>

          <p id={`${uid}-hint`} className={css.hint}>
            Hover or drag the strip. <kbd>←</kbd> <kbd>→</kbd> 10 mm · <kbd>Shift</kbd> 100 mm · <kbd>Alt</kbd> 1 mm · <kbd>Page Up</kbd>{' '}
            <kbd>Page Down</kbd> next boundary · <kbd>Home</kbd> <kbd>End</kbd>
          </p>

          <ol className={css.legend} aria-label={`Status of ${FLAGSHIP.doorId} along the wall`}>
            {segments.map((seg) => {
              const active = seg === current;
              return (
                <li key={`${seg.fromMm}-${seg.status}`}>
                  <button type="button" className={css.legendItem} data-status={seg.status} aria-current={active || undefined} onClick={() => jumpTo(seg.fromMm)}>
                    <svg className={css.legendSwatch} width={30} height={Y.trackH} viewBox={`0 0 30 ${Y.trackH}`} aria-hidden="true">
                      <line x1={0} x2={30} y1={Y.trackH / 2} y2={Y.trackH / 2} className={css.baseline} />
                      <rect
                        x={0.5}
                        y={(Y.trackH - BAND_H[seg.status]) / 2}
                        width={29}
                        height={BAND_H[seg.status]}
                        className={css.band}
                        data-status={seg.status}
                        fill={bandFill(seg.status)}
                      />
                    </svg>
                    <span className={css.legendStatus}>
                      <StatusIcon status={seg.status} size={13} />
                      <span className={css.legendLabel}>{STATUS_LABEL[seg.status]}</span>
                    </span>
                    <span className={css.legendRange}>
                      {num(seg.fromMm)}–{formatMm(seg.toMm)}
                      {seg.limitingIds.length ? <span className={css.legendIds}>{seg.limitingIds.join(', ')}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </div>
      </div>
    </section>
  );
}
