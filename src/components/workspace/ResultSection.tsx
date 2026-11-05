'use client';

import { StatusBadge, StatusIcon } from '@/components/ui/StatusBadge';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { locateElement } from '@/domain/model/lookup';
import type { Furniture } from '@/domain/model/types';
import { describeFieldChange } from '@/domain/revision/diff';
import { MODEL_LIMITATIONS } from '@/domain/revision/receipt';
import { useWorkspace } from '@/state/store';
import { useResultConsequence } from './useConsequence';
import styles from './inspector.module.css';

export function ResultSection() {
  const { view, consequence } = useResultConsequence();
  const select = useWorkspace((s) => s.select);
  if (!consequence) return null;
  const { doorId, door, room, analysis, attention, passing, pairs, governing, explanation, headline } = consequence;
  const sep = governing?.separation?.valueMm ?? null;
  const changes = view.evaluation?.diff.fields ?? [];
  const nameOf = (id: string) => {
    const found = locateElement(view.scene, id);
    return found?.kind === 'furniture' ? (found.element as Furniture).name : '';
  };

  return (
    <section className={styles.section} aria-labelledby="result-title" data-analysis={doorId} data-status={analysis.status}>
      <div className={styles.headingRow}>
        <h2 id="result-title" className={styles.heading}>
          Result <span className={styles.headingMeta}>{doorId} swing, computed live</span>
        </h2>
        <StatusBadge status={analysis.status} size="sm" />
      </div>

      <p className={styles.headline} data-testid="analysis-headline" data-status={analysis.status}>
        {headline}
      </p>

      <dl className={styles.metrics}>
        <div>
          <dt>Hinge</dt>
          <dd className="mono" data-testid="metric-hinge">
            {formatMm(door.hingeOffsetMm)}
          </dd>
        </div>
        <div>
          <dt>Opens</dt>
          <dd className="mono" data-testid="metric-opening">
            {analysis.maxOpeningDeg === null ? '—' : formatDeg(analysis.maxOpeningDeg)}
            {analysis.maxOpeningDeg === null ? null : <span className={styles.metricOf}>of {door.swingDeg}°</span>}
          </dd>
        </div>
        <div data-sign={sep !== null && sep < 0 ? 'negative' : 'positive'}>
          <dt>{sep !== null && sep < 0 ? 'Intrusion' : 'Clearance'}</dt>
          <dd className="mono" data-testid="metric-clearance">
            {sep === null ? '—' : formatMeasure(Math.abs(sep))}
          </dd>
        </div>
      </dl>

      {analysis.validity === 'VALID' && explanation ? (
        <ul className={styles.details}>
          {explanation.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : (
        <ul className={styles.details}>
          {analysis.issues.map((i) => (
            <li key={i.code}>
              <strong>{i.severity === 'INVALID' ? 'Invalid' : 'Unsupported'}:</strong> {i.message}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.block}>
        <h3 className={styles.subheading}>
          Tested {pairs.length} footprint{pairs.length === 1 ? '' : 's'}
        </h3>
        <p className={styles.testedMeta}>
          {doorId} sweep, radius <span className="mono">{formatMm(door.leafWidthMm)}</span>, 0–90° inward, against every footprint in {room.id}.
          Contact ±<span className="mono">{view.analysis.settings.contactToleranceMm} mm</span>, advisory{' '}
          <span className="mono">{formatMm(view.analysis.settings.nearClearanceMm)}</span>, exact integer predicates.
        </p>
        <ul className={styles.pairs} aria-label="Pairs that need attention">
          {attention.map((p) => (
            <li key={p.key} data-pair={p.furnitureId} data-status={p.status}>
              <button type="button" className={styles.pairButton} onClick={() => select(p.furnitureId)}>
                <StatusIcon status={p.status} size={13} />
                <span className="mono">{p.furnitureId}</span>
                <span className={styles.pairName}>{nameOf(p.furnitureId)}</span>
                <span className={styles.pairStatus}>{STATUS_LABEL[p.status]}</span>
                <span className={`mono ${styles.pairValue}`}>{p.separation ? formatMeasure(p.separation.valueMm) : 'not evaluated'}</span>
              </button>
            </li>
          ))}
        </ul>
        {passing.length ? (
          <details className={styles.passRow}>
            <summary>
              <StatusIcon status="PASS" size={13} />
              <span>
                {passing.length} pass{attention.length === 0 ? ' — every footprint clears the swing' : ''}
              </span>
            </summary>
            <ul className={styles.passList}>
              {passing.map((p) => (
                <li key={p.key}>
                  <span className="mono">{p.furnitureId}</span>
                  <span className={styles.pairName}>{nameOf(p.furnitureId)}</span>
                  <span className={`mono ${styles.pairValue}`}>{p.separation ? formatMeasure(p.separation.valueMm) : '—'}</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      <div className={styles.block}>
        <h3 className={styles.subheading}>What changed</h3>
        {view.kind === 'revision' ? (
          <p className={styles.muted}>Committed revision. No proposal is being rehearsed.</p>
        ) : changes.length === 0 ? (
          <p className={styles.muted}>No changes yet. Move {doorId} to rehearse a revision.</p>
        ) : (
          <ul className={styles.changes}>
            {changes.map((c) => (
              <li key={`${c.elementId}-${c.field}`} className="mono">
                {describeFieldChange(c)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.block}>
        <h3 className={styles.subheading}>Check manually</h3>
        <p className={styles.muted}>
          {explanation?.action ? `${explanation.action} ` : ''}Hardware, door stops, skirting and finishes are not modelled; confirm them on the
          drawings.
        </p>
      </div>

      <details className={styles.disclosure}>
        <summary>
          <span>Model assumptions</span>
          <span className={styles.summaryMeta}>{MODEL_LIMITATIONS.length}</span>
        </summary>
        <ul className={styles.assumptions}>
          {MODEL_LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
