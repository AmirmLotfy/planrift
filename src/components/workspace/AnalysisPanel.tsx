'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import type { PairAnalysis, PairStatus } from '@/domain/analysis/analyze';
import { explainDoor, explainPair } from '@/domain/analysis/explain';
import { formatAreaM2, formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { findDoor, locateElement } from '@/domain/model/lookup';
import { describeFieldChange } from '@/domain/revision/diff';
import { MODEL_LIMITATIONS } from '@/domain/revision/receipt';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import styles from './workspace.module.css';

const ORDER: PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED', 'CONTACT_REVIEW', 'NEAR_CLEARANCE', 'PASS'];

function governing(pairs: readonly PairAnalysis[]): PairAnalysis | undefined {
  return [...pairs].sort((a, b) => {
    const d = ORDER.indexOf(a.status) - ORDER.indexOf(b.status);
    if (d !== 0) return d;
    return (a.separation?.valueMm ?? Infinity) - (b.separation?.valueMm ?? Infinity);
  })[0];
}

export function AnalysisPanel() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const located = selectedId ? locateElement(view.scene, selectedId) : undefined;
  const doorId = located?.kind === 'door' ? selectedId! : 'D-101';
  const found = findDoor(view.scene, doorId);
  if (!found) return null;
  const ra = view.analysis.rooms.find((r) => r.roomId === found.room.id)!;
  const door = ra.doors.find((d) => d.doorId === doorId)!;
  const doorPairs = ra.pairs.filter((p) => p.doorId === doorId);
  const focusPairs = located?.kind === 'furniture' ? doorPairs.filter((p) => p.furnitureId === selectedId) : doorPairs;
  const main = governing(focusPairs);
  const explanation = main ? explainPair(view.scene, door, main) : null;
  const attention = doorPairs.filter((p) => p.status !== 'PASS');
  const passing = doorPairs.filter((p) => p.status === 'PASS');
  const conflicts = doorPairs.filter((p) => p.status === 'CONFLICT').length;
  const changes = view.evaluation?.diff.fields ?? [];
  const sep = main?.separation?.valueMm ?? null;

  return (
    <section className={styles.panel} aria-labelledby="analysis-title" data-analysis={doorId} data-status={door.status}>
      <div className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>Consequences · computed live</p>
          <h2 id="analysis-title" className={styles.panelTitle}>
            {door.doorId} swing analysis
          </h2>
        </div>
        <StatusBadge status={door.status} size="lg" />
      </div>

      <p className={styles.headline} data-testid="analysis-headline">
        {door.validity === 'VALID' && explanation ? explanation.headline : explainDoor(door, conflicts)}
      </p>

      <dl className={styles.metrics}>
        <div>
          <dt>Hinge</dt>
          <dd className="mono" data-testid="metric-hinge">
            {formatMm(found.door.hingeOffsetMm)}
          </dd>
        </div>
        <div>
          <dt>Max opening</dt>
          <dd className="mono" data-testid="metric-opening">
            {door.maxOpeningDeg === null ? '—' : `${formatDeg(door.maxOpeningDeg)} / 90°`}
          </dd>
        </div>
        <div>
          <dt>{sep !== null && sep < 0 ? 'Intrusion' : 'Clearance'}</dt>
          <dd className="mono" data-testid="metric-clearance">
            {sep === null ? '—' : formatMeasure(Math.abs(sep))}
          </dd>
        </div>
        <div>
          <dt>Overlap</dt>
          <dd className="mono">{main?.overlapAreaMm2 ? formatAreaM2(main.overlapAreaMm2) : '—'}</dd>
        </div>
      </dl>

      {door.validity === 'VALID' && explanation ? (
        <ul className={styles.detailList}>
          {explanation.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : (
        <ul className={styles.detailList}>
          {door.issues.map((i) => (
            <li key={i.code}>
              <strong>{i.severity === 'INVALID' ? 'Invalid' : 'Unsupported'}:</strong> {i.message}
            </li>
          ))}
        </ul>
      )}

      <div className={styles.subsection}>
        <h3 className={styles.subTitle}>What changed</h3>
        {view.kind === 'revision' ? (
          <p className={styles.muted}>Committed revision. No proposal is being rehearsed.</p>
        ) : changes.length === 0 ? (
          <p className={styles.muted}>No changes yet. Move {doorId} to rehearse a revision.</p>
        ) : (
          <ul className={styles.plainList}>
            {changes.map((c) => (
              <li key={`${c.elementId}-${c.field}`} className="mono">
                {describeFieldChange(c)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={styles.subsection}>
        <h3 className={styles.subTitle}>What was tested</h3>
        <p className={styles.muted}>
          {door.doorId} sweep (radius {formatMm(found.door.leafWidthMm)}, 0–90°, inward) against {doorPairs.length} footprints in {found.room.id}.
          Contact tolerance ±{view.analysis.settings.contactToleranceMm} mm · advisory clearance {formatMm(view.analysis.settings.nearClearanceMm)} ·
          exact integer predicates.
        </p>
        <ul className={styles.pairList} aria-label="Pair results">
          {attention.map((p) => (
            <li key={p.key} data-pair={p.furnitureId} data-status={p.status}>
              <StatusBadge status={p.status} size="sm" />
              <span className="mono">{p.furnitureId}</span>
              <span className={styles.pairValue}>{p.separation ? formatMeasure(p.separation.valueMm) : 'not evaluated'}</span>
            </li>
          ))}
          {passing.length ? (
            <li className={styles.passSummary}>
              <StatusBadge status="PASS" size="sm" label={`${passing.length} pass`} />
              <span className={styles.muted}>{passing.map((p) => p.furnitureId).join(' · ')}</span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className={styles.subsection}>
        <h3 className={styles.subTitle}>Verify manually</h3>
        <ul className={styles.plainList}>
          {explanation?.action ? <li>{explanation.action}</li> : null}
          <li>Hardware, door stops, skirting and finishes are not modelled; confirm on the drawings.</li>
        </ul>
      </div>

      <details className={styles.advanced}>
        <summary>Model assumptions</summary>
        <ul className={styles.plainList}>
          {MODEL_LIMITATIONS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
