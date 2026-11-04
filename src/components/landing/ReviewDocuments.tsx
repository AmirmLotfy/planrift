/**
 * "A clear swing still changes the drawing set." — Revision B's impact records drawn as the
 * physical sheets they are: each shows the drawing as issued with the change marked up in red
 * pen, a title block, the computed reason and a highlighter on "Review required". Beside them, the
 * accepted revision receipt as a printed slip. Everything is read from reviewSet() (the engine).
 */

import { Check } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { RevealTitle } from '@/components/site/RevealTitle';
import { StatusBadge, StatusIcon } from '@/components/ui/StatusBadge';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { shortFingerprint } from '@/domain/io/canonical';
import type { Door, Room, Scene } from '@/domain/model/types';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { cloudPath } from '@/render/cloud';
import { buildPlanModel, cropForRooms, fitCropToAspect, type PlanBounds } from '@/render/planModel';
import { planToSvg } from '@/render/transforms';
import type { Vec } from '@/domain/geometry/frame';
import { reviewSet, type ReviewSheet } from './content';
import css from './reviewDocuments.module.css';
import s from './sections.module.css';

const DRAW_ASPECT = 1.9;
const num = (mm: number) => formatMm(mm).replace(/\s*mm$/, '');
const pts = (points: readonly Vec[]) => points.map((p) => `${Math.round(planToSvg(p).x)},${Math.round(planToSvg(p).y)}`).join(' ');

type ReviewData = ReturnType<typeof reviewSet>;

function opening(door: Door): [number, number] {
  return door.leafDirection === 'toward-end' ? [door.hingeOffsetMm, door.hingeOffsetMm + door.leafWidthMm] : [door.hingeOffsetMm - door.leafWidthMm, door.hingeOffsetMm];
}

function flagshipRoom(scene: Scene): Room {
  return scene.rooms.find((r) => r.id === FLAGSHIP.roomId)!;
}

function flagshipDoor(scene: Scene): Door {
  return flagshipRoom(scene).doors.find((d) => d.id === FLAGSHIP.doorId)!;
}

/** Revision delta: the triangle architects put beside a clouded change, with the revision mark. */
function Delta({ x, y, size, label }: { x: number; y: number; size: number; label: string }) {
  const h = size * 0.87;
  return (
    <g className={css.delta}>
      <polygon points={`${x},${y - h / 2} ${x + size / 2},${y + h / 2} ${x - size / 2},${y + h / 2}`} />
      <text x={x} y={y + h * 0.36} textAnchor="middle" fontSize={size * 0.5}>
        {label}
      </text>
    </g>
  );
}

/* ---------- A-101: floor plan as issued + redline of the proposed door ---------- */
function PlanMarkup({ data, label }: { data: ReviewData; label: string }) {
  const issued = buildPlanModel(data.issued.scene, data.issued.analysis);
  const proposal = buildPlanModel(data.proposal.scene, data.proposal.analysis);
  const crop = fitCropToAspect(
    cropForRooms(
      issued,
      issued.rooms.map((r) => r.roomId),
      { west: 380, east: 380, south: 520, north: 380 },
    ),
    DRAW_ASPECT,
  );
  const was = issued.rooms.flatMap((r) => r.doors).find((d) => d.doorId === FLAGSHIP.doorId)!;
  const now = proposal.rooms.flatMap((r) => r.doors).find((d) => d.doorId === FLAGSHIP.doorId)!;
  const all = [...(was.sweep ?? []), ...(now.sweep ?? [])].map(planToSvg);
  const pad = now.leafWidthMm * 0.3;
  const box = {
    x: Math.min(...all.map((p) => p.x)) - pad,
    y: Math.min(...all.map((p) => p.y)) - pad,
    width: Math.max(...all.map((p) => p.x)) - Math.min(...all.map((p) => p.x)) + pad * 2,
    height: Math.max(...all.map((p) => p.y)) - Math.min(...all.map((p) => p.y)) + pad * 2,
  };
  const w = crop.maxX - crop.minX;
  const h = crop.maxY - crop.minY;
  const unit = w / 480;
  return (
    <div className={css.drawingFrame}>
      <PlanDrawing model={issued} crop={crop} mode="thumbnail" renderWidthPx={480} title="Floor plan as issued" />
      <svg className={css.overlay} viewBox={`${crop.minX} ${-crop.maxY} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {now.arc ? <polyline points={pts(now.arc)} className={css.mkLine} strokeWidth={1.6 * unit} /> : null}
        <polygon points={pts(now.leaf)} className={css.mkFill} />
        <path d={cloudPath(box, box.height / 3.2)} pathLength={1} className={css.mkCloud} strokeWidth={1.8 * unit} />
        <Delta x={box.x + box.width + 9 * unit} y={box.y - 2 * unit} size={20 * unit} label={label} />
      </svg>
    </div>
  );
}

/* ---------- A-401: south wall interior elevation (seen from inside, so west is on the right) ---------- */
function ElevationMarkup({ data, documentId, label }: { data: ReviewData; documentId: string; label: string }) {
  const room = flagshipRoom(data.issued.scene);
  const was = flagshipDoor(data.issued.scene);
  const now = flagshipDoor(data.proposal.scene);
  const W = room.widthMm;
  const H = room.heightMm;
  const X = (x: number) => W - x;
  const onSheet = new Set(data.issued.scene.links.filter((l) => l.documentId === documentId).map((l) => l.elementId));
  const furniture = room.furniture.filter((f) => onSheet.has(f.id) && f.footprint.kind === 'rect');
  const pad = { l: 520, r: 520, t: 380, b: 760 };
  const vb = { x: -pad.l, y: -(H + pad.t), w: W + pad.l + pad.r, h: H + pad.t + pad.b };
  const u = vb.w / 480;
  const [wa, wb] = opening(was);
  const [na, nb] = opening(now);
  const hingeX = X(now.hingeOffsetMm);
  const dimY = 330;
  const cloud = { x: X(nb) - 170, y: -now.heightMm - 170, width: nb - na + 340, height: now.heightMm + 250 };
  const swingMarks = (a: number, b: number, door: Door) => {
    // Elevation convention: dashed lines meet at the hinge side.
    const hingeSide = door.leafDirection === 'toward-end' ? X(a) : X(b);
    const latchSide = door.leafDirection === 'toward-end' ? X(b) : X(a);
    return `M${latchSide} ${-door.heightMm} L${hingeSide} ${-door.heightMm / 2} L${latchSide} 0`;
  };
  return (
    <div className={css.drawingFrame}>
      <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`South wall elevation as issued, with ${FLAGSHIP.doorId} marked at ${formatMm(now.hingeOffsetMm)}`}>
        <rect x={vb.x} y={vb.y} width={vb.w} height={vb.h} className={css.paper} />
        <rect x={0} y={-H} width={W} height={H} className={css.inkThin} />
        <line x1={-pad.l * 0.6} x2={W + pad.r * 0.6} y1={0} y2={0} className={css.inkFloor} />
        {furniture.map((f) => {
          if (f.footprint.kind !== 'rect') return null;
          const { minX, maxX } = f.footprint;
          return (
            <g key={f.id}>
              <rect x={X(maxX)} y={-f.heightMm} width={maxX - minX} height={f.heightMm} className={css.furniture} />
              <text x={X(maxX) + (maxX - minX) / 2} y={-f.heightMm - 70} textAnchor="middle" className={css.inkLabel} fontSize={10 * u}>
                {f.id}
              </text>
            </g>
          );
        })}
        {/* As issued. */}
        <rect x={X(wb)} y={-was.heightMm} width={wb - wa} height={was.heightMm} className={css.inkDoor} />
        <path d={swingMarks(wa, wb, was)} className={css.inkDash} />
        <text x={X(wb) + (wb - wa) / 2} y={-was.heightMm - 70} textAnchor="middle" className={css.inkLabel} fontSize={10 * u}>
          {was.id}
        </text>
        {/* Red pen: the proposed opening and its dimension from the west corner. */}
        <rect x={X(nb)} y={-now.heightMm} width={nb - na} height={now.heightMm} className={css.mkLine} strokeWidth={1.6 * u} />
        <path d={swingMarks(na, nb, now)} className={css.mkDash} strokeWidth={1.2 * u} />
        <line x1={X(0)} x2={hingeX} y1={dimY} y2={dimY} className={css.mkLine} strokeWidth={1.1 * u} />
        <line x1={X(0)} x2={X(0)} y1={dimY - 110} y2={dimY + 110} className={css.mkLine} strokeWidth={1.1 * u} />
        <line x1={hingeX} x2={hingeX} y1={dimY - 110} y2={dimY + 110} className={css.mkLine} strokeWidth={1.1 * u} />
        <text x={(X(0) + hingeX) / 2} y={dimY - 60} textAnchor="middle" className={css.mkText} fontSize={10.5 * u}>
          {num(now.hingeOffsetMm)}
        </text>
        <path d={cloudPath(cloud, 300)} pathLength={1} className={css.mkCloud} strokeWidth={1.8 * u} />
        <Delta x={cloud.x - 12 * u} y={cloud.y + 4 * u} size={20 * u} label={label} />
      </svg>
    </div>
  );
}

/* ---------- D-01: door schedule rows as issued, location cell marked up ---------- */
function ScheduleMarkup({ data, documentId, label }: { data: ReviewData; documentId: string; label: string }) {
  const onSheet = new Set(data.issued.scene.links.filter((l) => l.documentId === documentId).map((l) => l.elementId));
  const rows = data.issued.scene.rooms.flatMap((room) =>
    room.doors
      .filter((d) => onSheet.has(d.id))
      .map((d) => ({ room, door: d, wall: room.walls.find((w) => w.id === d.wallId)! })),
  );
  const proposed = flagshipDoor(data.proposal.scene);
  const cols = [
    { key: 'mark', title: 'MARK', x: 18 },
    { key: 'size', title: 'SIZE', x: 94 },
    { key: 'op', title: 'OPERATION', x: 202 },
    { key: 'wall', title: 'WALL', x: 332 },
    { key: 'hinge', title: 'HINGE', x: 472 },
  ] as const;
  const top = 22;
  const rowH = 44;
  const width = 600;
  const height = top + rowH * (rows.length + 1) + 34;
  const cells = (row: (typeof rows)[number]): Record<(typeof cols)[number]['key'], ReactNode> => ({
    mark: row.door.id,
    size: `${row.door.leafWidthMm} × ${row.door.heightMm}`,
    op: row.door.operation,
    wall: `${row.room.id} · ${row.wall.side}`,
    hinge: num(row.door.hingeOffsetMm),
  });
  return (
    <div className={css.drawingFrame}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Door schedule rows as issued, with the ${FLAGSHIP.doorId} location marked`}>
        <rect x={0} y={0} width={width} height={height} className={css.paper} />
        <rect x={8} y={top} width={width - 16} height={rowH * (rows.length + 1)} className={css.inkThin} />
        {cols.map((c) => (
          <text key={c.key} x={c.x} y={top + 27} className={css.schedHead}>
            {c.title}
          </text>
        ))}
        {cols.slice(1).map((c) => (
          <line key={c.key} x1={c.x - 10} x2={c.x - 10} y1={top} y2={top + rowH * (rows.length + 1)} className={css.inkHair} />
        ))}
        {rows.map((row, i) => {
          const y = top + rowH * (i + 1);
          const values = cells(row);
          const changed = row.door.id === FLAGSHIP.doorId;
          return (
            <g key={row.door.id}>
              <line x1={8} x2={width - 8} y1={y} y2={y} className={css.inkHair} />
              {cols.map((c) => (
                <text key={c.key} x={c.x} y={y + 28} className={css.schedCell}>
                  {values[c.key]}
                </text>
              ))}
              {changed ? (
                <g>
                  {/* Red pen through the issued hinge position, the new value written beside it. */}
                  <line x1={468} x2={514} y1={y + 24} y2={y + 24} className={css.mkLine} strokeWidth={1.6} />
                  <text x={522} y={y + 28} className={css.mkText} fontSize={13}>
                    {num(proposed.hingeOffsetMm)}
                  </text>
                  <path d={cloudPath({ x: 461, y: y + 4, width: width - 8 - 461 - 4, height: rowH - 8 }, 20)} pathLength={1} className={css.mkCloud} strokeWidth={1.6} />
                  <Delta x={461} y={y + 6} size={18} label={label} />
                </g>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SheetCard({ sheet, index, data }: { sheet: ReviewSheet; index: number; data: ReviewData }) {
  const { impact, document, view } = sheet;
  const label = data.receipt.scenario.label;
  const headId = `sheet-${document.id}`;
  return (
    <div className={css.slot} data-reveal="" style={{ '--i': index, '--k': index } as CSSProperties}>
    <article className={css.sheet} aria-labelledby={headId}>
      <div className={css.drawing}>
        {view === 'plan' ? (
          <PlanMarkup data={data} label={label} />
        ) : view === 'elevation' ? (
          <ElevationMarkup data={data} documentId={document.id} label={label} />
        ) : (
          <ScheduleMarkup data={data} documentId={document.id} label={label} />
        )}
      </div>
      <div className={css.titleBlock}>
        <div className={css.tbRow}>
          <h3 id={headId} className={css.sheetId}>
            {document.id}
          </h3>
          <span className={css.rev}>REV {document.revision}</span>
        </div>
        <p className={css.sheetTitle}>{document.title}</p>
        <dl className={css.tbMeta}>
          <div>
            <dt>Issued</dt>
            <dd>{document.issuedOn}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{document.status}</dd>
          </div>
        </dl>
        <div className={css.reasons}>
          {impact.reasons.map((r) => (
            <p key={r.linkId + r.description}>
              <span className={css.reasonChange}>{r.description}</span>
              <span className={css.reasonNote}>{r.linkNote}</span>
            </p>
          ))}
        </div>
        <p className={css.review}>
          <span className={css.swipe}>
            <StatusIcon status={impact.status} size={13} inherit />
            Review required
          </span>
        </p>
      </div>
    </article>
    </div>
  );
}

/** Bars drawn from the result fingerprint: the receipt's identity, printed. */
function FingerprintBars({ hex }: { hex: string }) {
  let x = 0;
  const bars: { x: number; w: number }[] = [];
  for (const ch of hex.slice(0, 48)) {
    const v = Number.parseInt(ch, 16);
    const w = 1 + (v % 3);
    bars.push({ x, w });
    x += w + 1 + ((v >> 2) % 3);
  }
  return (
    <svg className={css.bars} viewBox={`0 0 ${x} 24`} preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b) => (
        <rect key={b.x} x={b.x} y={0} width={b.w} height={24} />
      ))}
    </svg>
  );
}

function ReceiptSlip({ data }: { data: ReviewData }) {
  const r = data.receipt;
  const pair = r.analysis.pairs.find((p) => p.doorId === FLAGSHIP.doorId && p.furnitureId === FLAGSHIP.consoleId);
  const door = r.analysis.doors.find((d) => d.doorId === FLAGSHIP.doorId);
  const swing = flagshipDoor(data.proposal.scene).swingDeg;
  const decided = r.decision.decidedAt.replace('T', ' ').slice(0, 16);
  const teeth = Array.from({ length: 29 }, (_, i) => `${(i * 100) / 28},${i % 2 ? 0 : 8}`).join(' ');
  return (
    <div className={css.slipWrap} data-reveal="" style={{ '--i': 3 } as CSSProperties}>
      <div className={css.slip}>
        <svg className={css.edgeTop} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`0,8 ${teeth} 100,8`} />
        </svg>
        <div className={css.slipBody}>
          <p className={css.slipKicker}>PLANRIFT · revision receipt</p>
          <p className={css.slipId}>{r.id}</p>
          <p className={css.slipProject}>{r.project.name}</p>
          <p className={css.slipScenario}>
            Scenario {r.scenario.label} · {r.scenario.name}
          </p>

          <dl className={css.slipList}>
            <div>
              <dt>Change</dt>
              {r.changes.map((c) => (
                <dd key={c.field}>{c.description}</dd>
              ))}
            </div>
            <div>
              <dt>Result</dt>
              {pair ? (
                <dd className={css.slipResult}>
                  <span>
                    {pair.doorId} × {pair.furnitureId}
                  </span>
                  <StatusBadge status={pair.status} size="sm" />
                  <span>{pair.separationMm === null ? '—' : formatMeasure(pair.separationMm)}</span>
                </dd>
              ) : null}
              {door ? (
                <dd>
                  {door.doorId} opens {door.maxOpeningDeg === null ? '—' : formatDeg(door.maxOpeningDeg)} of {swing}°
                </dd>
              ) : null}
            </div>
            <div>
              <dt>Source → result</dt>
              <dd>
                {r.source.revisionId} {shortFingerprint(r.source.fingerprint)}
              </dd>
              <dd>
                → {r.result.revisionId ?? '—'} {shortFingerprint(r.result.fingerprint)}
              </dd>
            </div>
            <div>
              <dt>Documents {r.decision.acknowledgedDocuments ? 'acknowledged' : 'not acknowledged'}</dt>
              {r.impacts.map((i) => (
                <dd key={i.documentId} className={css.slipDoc}>
                  <span>
                    {i.documentId} rev {i.revision}
                  </span>
                  {r.decision.acknowledgedDocuments ? (
                    <>
                      <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span className="visually-hidden">acknowledged</span>
                    </>
                  ) : null}
                </dd>
              ))}
            </div>
            <div>
              <dt>Decision</dt>
              <dd className={css.slipDecision}>
                {r.decision.outcome === 'accepted' ? 'Accepted' : 'Rejected'} · {r.decision.reviewer}
              </dd>
              <dd>{decided} UTC</dd>
              <dd className={css.slipNote}>“{r.decision.note}”</dd>
            </div>
          </dl>
          <FingerprintBars hex={r.result.fingerprint} />
          <p className={css.slipEngine}>{r.analysis.engineVersion}</p>
        </div>
        <svg className={css.edgeBottom} viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`0,0 ${teeth} 100,0`} />
        </svg>
      </div>
      <p className={css.slipCaption}>A review record, not a construction certificate or a compliance statement.</p>
    </div>
  );
}

export function ReviewDocuments() {
  const data = reviewSet();
  const proposalDoor = flagshipDoor(data.proposal.scene);
  const pair = data.receipt.analysis.pairs.find((p) => p.doorId === FLAGSHIP.doorId && p.furnitureId === FLAGSHIP.consoleId);
  const change = data.receipt.changes[0];
  const moved = change && typeof change.before === 'number' && typeof change.after === 'number' ? change.after - change.before : null;

  return (
    <section id="review" className={s.section} aria-labelledby="review-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={`${s.head} ${s.headSplit}`}>
          <RevealTitle id="review-title" className={s.title} lines={['A clear swing still', 'changes the drawing set.']} />
          <p className={s.dek} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
            At {formatMm(proposalDoor.hingeOffsetMm)}, {FLAGSHIP.doorId} clears {FLAGSHIP.consoleId}
            {pair && pair.separationMm !== null ? ` by ${formatMeasure(pair.separationMm)}` : ''}. The door still moved
            {moved !== null ? ` ${formatMm(Math.abs(moved))}` : ''}, so
            every sheet linked to it is flagged for a person to revise and re-issue. PLANRIFT marks them; it never edits them.
          </p>
        </div>

        <div className={css.layout}>
          <div className={css.stack}>
            {data.sheets.map((sheet, i) => (
              <SheetCard key={sheet.document.id} sheet={sheet} index={i} data={data} />
            ))}
            {data.untouchedDocuments.length || data.untouchedRooms.length ? (
              <p className={css.untouched} data-reveal="" style={{ '--i': data.sheets.length } as CSSProperties}>
                <span className={css.untouchedMark} aria-hidden="true" />
                <span>
                  No record for{' '}
                  {[...data.untouchedRooms, ...data.untouchedDocuments.map((d) => `${d.id} ${d.title}`)].map((label, i, all) => (
                    <span key={label}>
                      <span className={css.untouchedId}>{label}</span>
                      {i < all.length - 1 ? (i === all.length - 2 ? ' or ' : ', ') : ''}
                    </span>
                  ))}
                  . Only sheets linked to the element that changed are flagged.
                </span>
              </p>
            ) : null}
          </div>
          <ReceiptSlip data={data} />
        </div>
      </div>
    </section>
  );
}
