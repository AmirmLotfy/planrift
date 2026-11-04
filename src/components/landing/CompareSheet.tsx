/**
 * "Three positions. One breaks." — a spec-sheet comparison of the approved position and two
 * proposals. Every row is read from the engine (solveAt) and the sample review (sampleDecision).
 */

import { Check, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { RevealTitle } from '@/components/site/RevealTitle';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDeg, formatMeasure, formatMm, formatSignedDelta } from '@/domain/format';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { buildPlanModel, fitCropToAspect, type PlanBounds, type PlanModel } from '@/render/planModel';
import { BASELINE } from './engine';
import { compareSheet, type CompareSheetColumn } from './content';
import css from './compareSheet.module.css';
import s from './sections.module.css';

const THUMB_ASPECT = 16 / 10;
const ROWS = ['Plan detail', 'Result', 'Hinge', 'Door opens', `Console ${FLAGSHIP.consoleId}`, 'Drawings to review', 'Decision'] as const;

/** One crop for every column: the union of each door sweep, its wall and the console, padded. */
function detailCrop(models: readonly PlanModel[]): PlanBounds {
  const xs: number[] = [];
  const ys: number[] = [];
  let leaf = 0;
  for (const model of models) {
    const room = model.rooms.find((r) => r.roomId === FLAGSHIP.roomId)!;
    const door = room.doors.find((d) => d.doorId === FLAGSHIP.doorId)!;
    const item = room.furniture.find((f) => f.furnitureId === FLAGSHIP.consoleId)!;
    const wallFace = { x: door.hinge.x + door.outward.x * door.wallThicknessMm, y: door.hinge.y + door.outward.y * door.wallThicknessMm };
    for (const p of [...(door.sweep ?? []), ...door.leaf, door.openingFrom, door.openingTo, wallFace, ...item.polygon]) {
      xs.push(p.x);
      ys.push(p.y);
    }
    leaf = Math.max(leaf, door.leafWidthMm);
  }
  const pad = leaf * 0.34;
  return fitCropToAspect({ minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - pad, maxY: Math.max(...ys) + pad }, THUMB_ASPECT);
}

/** Quarter-circle gauge of how far the leaf opens (0–swing°). */
function Protractor({ deg, swing, blocked }: { deg: number | null; swing: number; blocked: boolean }) {
  const r = 22;
  const o = { x: 3, y: 27 };
  const at = (a: number) => ({ x: o.x + r * Math.cos((a * Math.PI) / 180), y: o.y - r * Math.sin((a * Math.PI) / 180) });
  const end = at(deg ?? 0);
  const full = at(swing);
  return (
    <svg className={css.protractor} width={30} height={30} viewBox="0 0 30 30" aria-hidden="true">
      <path d={`M${o.x} ${o.y} H${o.x + r} A${r} ${r} 0 0 0 ${full.x} ${full.y} Z`} className={css.protractorTrack} />
      {deg !== null && deg > 0 ? (
        <path d={`M${o.x} ${o.y} H${o.x + r} A${r} ${r} 0 0 0 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`} className={css.protractorFill} data-blocked={blocked || undefined} />
      ) : null}
      <line x1={o.x} y1={o.y} x2={end.x.toFixed(2)} y2={end.y.toFixed(2)} className={css.protractorLeaf} data-blocked={blocked || undefined} />
    </svg>
  );
}

function Decision({ col, sourceRevisionId }: { col: CompareSheetColumn; sourceRevisionId: string }) {
  if (col.deltaMm === 0) {
    return (
      <p className={css.decision}>
        <span className={css.decisionOutcome}>Approved baseline</span>
        <span className={css.decisionMeta}>{sourceRevisionId} · in force</span>
      </p>
    );
  }
  if (!col.receipt) return <p className={css.muted}>Not reviewed</p>;
  const { decision } = col.receipt;
  return (
    <p className={css.decision}>
      <span className={css.decisionOutcome} data-outcome={decision.outcome}>
        {decision.outcome === 'accepted' ? <Check size={15} strokeWidth={2.4} aria-hidden="true" /> : <X size={15} strokeWidth={2.4} aria-hidden="true" />}
        {decision.outcome === 'accepted' ? 'Accepted' : 'Rejected'}
        <span className={css.decisionBy}>· {decision.reviewer}</span>
      </span>
      <span className={css.decisionNote}>“{decision.note}”</span>
      <span className={css.decisionMeta}>{col.receipt.id}</span>
    </p>
  );
}

export function CompareSheet() {
  const { columns, sourceRevisionId } = compareSheet();
  const models = columns.map((col) => buildPlanModel(col.frame.scene, col.frame.analysis, { selectedId: FLAGSHIP.doorId }));
  const crop = detailCrop(models);
  const swing = BASELINE.rooms.find((r) => r.id === FLAGSHIP.roomId)!.doors.find((d) => d.id === FLAGSHIP.doorId)!.swingDeg;
  const breaks = columns.find((c) => c.status === 'CONFLICT');
  const clears = columns.find((c) => c.receipt?.decision.outcome === 'accepted');
  const settings = BASELINE.settings;

  return (
    <section id="compare" className={s.section} aria-labelledby="compare-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={`${s.head} ${s.headSplit}`}>
          <RevealTitle id="compare-title" className={s.title} lines={['Three positions.', 'One breaks.']} />
          <p className={s.dek} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
            The approved plan and two proposals, measured by the same engine with the same settings.
            {breaks && breaks.maxOpeningDeg !== null ? (
              <>
                {' '}
                {breaks.label} strikes console {FLAGSHIP.consoleId} after {formatDeg(breaks.maxOpeningDeg)}.
              </>
            ) : null}
            {clears?.console ? (
              <>
                {' '}
                {clears.label} clears it by {formatMeasure(clears.console.separationMm)} and still puts {clears.documents.length} drawings under review.
              </>
            ) : null}
          </p>
        </div>

        <div className={css.sheet} data-reveal="" style={{ '--i': 2, '--cols': columns.length } as CSSProperties}>
          <div className={css.sheetHead}>
            <span>
              {FLAGSHIP.doorId} × {FLAGSHIP.consoleId} · {FLAGSHIP.roomId}
            </span>
            <span>
              Contact ±{settings.contactToleranceMm} mm · near clearance &lt; {formatMm(settings.nearClearanceMm)}
            </span>
          </div>
          <div className={css.labels} aria-hidden="true">
            <span className={css.labelCell} />
            {ROWS.map((row) => (
              <span key={row} className={css.labelCell}>
                {row}
              </span>
            ))}
          </div>
          {columns.map((col, i) => {
            const headId = `compare-col-${i}`;
            const sep = col.console?.separationMm ?? null;
            return (
              <article key={col.label} className={css.col} data-breaks={col.status === 'CONFLICT' || undefined} aria-labelledby={headId}>
                <header className={`${css.cell} ${css.colHead}`}>
                  <h3 id={headId} className={css.colTitle}>
                    {col.label}
                  </h3>
                  <span className={css.colSub}>{col.sub}</span>
                </header>
                <figure className={`${css.cell} ${css.thumbCell}`}>
                  <span className={css.rowLabel}>{ROWS[0]}</span>
                  <div className={css.thumb} style={{ aspectRatio: String(THUMB_ASPECT) }}>
                    <PlanDrawing
                      model={models[i]!}
                      crop={crop}
                      mode="thumbnail"
                      focusDoorId={FLAGSHIP.doorId}
                      renderWidthPx={400}
                      title={`${col.label}: ${FLAGSHIP.doorId} at ${formatMm(col.hingeMm)}`}
                      description={col.headline}
                    />
                  </div>
                </figure>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[1]}</span>
                  <div className={css.result}>
                    <StatusBadge status={col.status} />
                    <p>{col.headline}</p>
                  </div>
                </div>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[2]}</span>
                  <p className={css.value}>
                    <span className={css.big}>{formatMm(col.hingeMm)}</span>
                    <span className={css.delta}>{col.deltaMm === 0 ? 'baseline' : formatSignedDelta(col.deltaMm)}</span>
                  </p>
                </div>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[3]}</span>
                  <p className={css.value}>
                    <Protractor deg={col.maxOpeningDeg} swing={swing} blocked={col.maxOpeningDeg !== null && col.maxOpeningDeg < swing} />
                    <span className={css.big}>{col.maxOpeningDeg === null ? '—' : formatDeg(col.maxOpeningDeg)}</span>
                    <span className={css.delta}>of {swing}°</span>
                  </p>
                </div>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[4]}</span>
                  <p className={css.value}>
                    <span className={css.big} data-intrusion={(sep !== null && sep < 0) || undefined}>
                      {sep === null ? '—' : formatMeasure(Math.abs(sep))}
                    </span>
                    <span className={css.delta}>{sep === null ? 'not evaluated' : sep < 0 ? 'intrusion' : 'clear'}</span>
                  </p>
                </div>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[5]}</span>
                  {col.documents.length ? (
                    <p className={css.docs}>
                      <StatusBadge status="REVIEW_REQUIRED" size="sm" label={`${col.documents.length} to review`} />
                      <span className={css.docIds}>{col.documents.join(' · ')}</span>
                    </p>
                  ) : (
                    <p className={css.muted}>None</p>
                  )}
                </div>
                <div className={css.cell}>
                  <span className={css.rowLabel}>{ROWS[6]}</span>
                  <Decision col={col} sourceRevisionId={sourceRevisionId} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
