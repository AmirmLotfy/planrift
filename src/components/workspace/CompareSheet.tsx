'use client';

import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { StatusBadge, StatusIcon } from '@/components/ui/StatusBadge';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatDeg, formatMeasure, formatMm, formatSignedDelta } from '@/domain/format';
import { buildComparison, type ComparisonColumn } from '@/domain/revision/compare';
import { analysisOf, useWorkspace } from '@/state/store';
import { buildPlanModel } from '@/render/planModel';
import { LIFECYCLE_LABEL, primaryActionLabel } from './lifecycle';
import styles from './compare.module.css';

const DOOR_ID = 'D-101';

/** One crop for every thumbnail, so the columns compare like for like. */
function useCrop(columns: readonly ComparisonColumn[], doorId: string) {
  return useMemo(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const col of columns) {
      const model = buildPlanModel(col.scene, col.analysis, {});
      const door = model.rooms.flatMap((r) => r.doors).find((d) => d.doorId === doorId);
      if (!door) continue;
      for (const p of [...(door.sweep ?? []), ...door.leaf, door.openingFrom, door.openingTo]) {
        xs.push(p.x);
        ys.push(p.y);
      }
      for (const id of col.attentionPairs.map((p) => p.furnitureId)) {
        const f = model.rooms.flatMap((r) => r.furniture).find((x) => x.furnitureId === id);
        for (const p of f?.polygon ?? []) {
          xs.push(p.x);
          ys.push(p.y);
        }
      }
    }
    if (!xs.length) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    const pad = 650;
    return { minX: Math.min(...xs) - pad, maxX: Math.max(...xs) + pad, minY: Math.min(...ys) - 450, maxY: Math.max(...ys) + pad };
  }, [columns, doorId]);
}

function governingText(col: ComparisonColumn) {
  const g = col.governing;
  if (!g) return <span className={styles.muted}>—</span>;
  if (g.separationMm === null)
    return (
      <>
        <span className="mono">{g.furnitureId}</span> <span className={styles.muted}>not evaluated</span>
      </>
    );
  return (
    <>
      <span className={`mono ${styles.figure}`} data-sign={g.separationMm < 0 ? 'negative' : 'positive'}>
        {formatMeasure(Math.abs(g.separationMm))}
      </span>{' '}
      <span className={styles.muted}>
        {g.separationMm < 0 ? 'intrusion into' : 'clear of'} <span className="mono">{g.furnitureId}</span>
      </span>
    </>
  );
}

export function CompareSheet({ onOpenDecision }: { onOpenDecision: () => void }) {
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const setView = useWorkspace((s) => s.setView);
  const active = project.scenarios.find((s) => s.id === activeId);
  const sourceId = active?.sourceRevisionId ?? project.scenarios[0]?.sourceRevisionId;
  const idKey = project.scenarios
    .filter((s) => s.sourceRevisionId === sourceId)
    .map((s) => s.id)
    .join(',');
  const columns = useMemo(() => buildComparison(project, idKey ? idKey.split(',') : [], DOOR_ID), [project, idKey]);
  const crop = useCrop(columns, DOOR_ID);
  const back = (
    <button type="button" className={styles.back} onClick={() => setView('edit')}>
      <ArrowLeft size={15} aria-hidden="true" />
      Back to editing
    </button>
  );

  if (columns.length < 2) {
    return (
      <div className={styles.empty}>
        <p>Create at least one scenario to compare it with its source revision.</p>
        {back}
      </div>
    );
  }

  const open = (id: string) => {
    setActive(id);
    setView('edit');
  };
  const actionLabel = (col: ComparisonColumn) => (col.lifecycle === 'committed' ? 'Open' : primaryActionLabel(col.lifecycle));

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Same change, different consequences</h1>
          <p className={styles.sub}>
            <span className="mono">{DOOR_ID}</span> in {columns.length - 1} alternative{columns.length > 2 ? 's' : ''} against{' '}
            <span className="mono">{columns[0]!.id}</span>. Every value is computed from each scenario&apos;s own scene.
          </p>
        </div>
        {back}
      </header>

      <div className={styles.scroller}>
        <table className={styles.sheet} style={{ ['--cols' as string]: columns.length }}>
          <caption className="visually-hidden">Comparison of {columns.map((c) => c.label).join(', ')} for door {DOOR_ID}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.corner}>
                <span className="visually-hidden">Property</span>
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={styles.colHead}
                  data-column={col.label}
                  data-status={col.doorStatus}
                  data-active={col.id === activeId ? 'true' : 'false'}
                >
                  <span className={styles.colLabel}>
                    <StatusIcon status={col.doorStatus} size={13} />
                    {col.label}
                  </span>
                  <span className={styles.colName}>{col.kind === 'revision' ? `${col.id} · ${col.name}` : col.name}</span>
                  {col.kind === 'scenario' ? (
                    <span className={styles.colActions}>
                      <button type="button" className={styles.colButton} onClick={() => open(col.id)} aria-label={`Open ${col.label}`}>
                        Open
                      </button>
                      <button
                        type="button"
                        className={`${styles.colButton} ${styles.colPrimary}`}
                        onClick={() => {
                          setActive(col.id);
                          onOpenDecision();
                        }}
                        aria-label={`${actionLabel(col)} ${col.label}`}
                      >
                        {actionLabel(col)}
                      </button>
                    </span>
                  ) : (
                    <span className={styles.colActions}>
                      <button type="button" className={styles.colButton} onClick={() => open(col.id)} aria-label={`Open ${col.label}`}>
                        Open
                      </button>
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className={styles.thumbRow}>
              <th scope="row">Plan</th>
              {columns.map((col) => (
                <td key={col.id}>
                  <div className={styles.thumb}>
                    <PlanDrawing
                      model={buildPlanModel(col.scene, analysisOf(col.scene), { selectedId: DOOR_ID })}
                      crop={crop}
                      mode="thumbnail"
                      focusDoorId={DOOR_ID}
                      title={`${col.label} plan detail`}
                      description={`${DOOR_ID} at ${col.hingeOffsetMm ?? '—'} mm: ${STATUS_LABEL[col.doorStatus]}`}
                    />
                  </div>
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Status</th>
              {columns.map((col) => (
                <td key={col.id}>
                  <StatusBadge status={col.doorStatus} />
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Hinge position</th>
              {columns.map((col) => (
                <td key={col.id} className="mono" data-testid={`compare-hinge-${col.label}`}>
                  <span className={styles.figure}>{col.hingeOffsetMm === null ? '—' : formatMm(col.hingeOffsetMm)}</span>
                  {col.hingeDeltaMm ? <span className={styles.delta}> {formatSignedDelta(col.hingeDeltaMm)}</span> : null}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Opens</th>
              {columns.map((col) => (
                <td key={col.id} className="mono">
                  <span className={styles.figure}>{col.maxOpeningDeg === null ? '—' : formatDeg(col.maxOpeningDeg)}</span>
                  {col.maxOpeningDeg === null ? null : <span className={styles.muted}> / 90°</span>}
                  {col.limitingFurnitureId && col.maxOpeningDeg !== null && col.maxOpeningDeg < 90 ? (
                    <span className={styles.muted}> · strikes {col.limitingFurnitureId}</span>
                  ) : null}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Governing distance</th>
              {columns.map((col) => (
                <td key={col.id}>{governingText(col)}</td>
              ))}
            </tr>
            <tr>
              <th scope="row">Needs attention</th>
              {columns.map((col) => (
                <td key={col.id}>
                  {col.attentionPairs.length ? (
                    <span className={styles.chips}>
                      {col.attentionPairs.map((p) => (
                        <StatusBadge key={p.furnitureId} status={p.status} size="sm" label={p.furnitureId} />
                      ))}
                    </span>
                  ) : (
                    <span className={styles.muted}>Nothing</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Changed elements</th>
              {columns.map((col) => (
                <td key={col.id} className="mono">
                  {col.changedElementIds.length ? <span className={styles.changed}>{col.changedElementIds.join(', ')}</span> : <span className={styles.muted}>—</span>}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Documents to review</th>
              {columns.map((col) => (
                <td key={col.id} data-testid={`compare-docs-${col.label}`}>
                  {col.impacts.length ? (
                    <span className={styles.chips}>
                      {col.impacts.map((i) => (
                        <span key={i.documentId} className={`mono ${styles.docChip}`}>
                          {i.documentId}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={styles.muted}>None</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <th scope="row">Decision</th>
              {columns.map((col) => (
                <td key={col.id}>
                  <span className={styles.lifecycle}>{LIFECYCLE_LABEL[col.lifecycle]}</span>
                  {col.decision ? <span className={styles.muted}> · {col.decision.note}</span> : null}
                  {col.remarks ? <span className={styles.remarks}>{col.remarks}</span> : null}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.note}>
        Document review persists for any alternative that changes <span className="mono">{DOOR_ID}</span>, even when its swing is clear: the
        drawings show the door, so they must be revised and re-issued by the design team.
      </p>
    </div>
  );
}
