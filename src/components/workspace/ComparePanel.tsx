'use client';

import { useMemo } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/primitives';
import { formatDeg, formatMeasure, formatMm, formatSignedDelta } from '@/domain/format';
import { buildComparison, type ComparisonColumn } from '@/domain/revision/compare';
import { analysisOf, useWorkspace } from '@/state/store';
import { buildPlanModel } from '@/render/planModel';
import styles from './workspace.module.css';

const LIFECYCLE = {
  committed: 'Committed',
  draft: 'Draft',
  ready_for_review: 'Ready for review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
} as const;

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

export function ComparePanel({ onOpenDecision }: { onOpenDecision: () => void }) {
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const setView = useWorkspace((s) => s.setView);
  const doorId = 'D-101';
  const active = project.scenarios.find((s) => s.id === activeId);
  const sourceId = active?.sourceRevisionId ?? project.scenarios[0]?.sourceRevisionId;
  const idKey = project.scenarios.filter((s) => s.sourceRevisionId === sourceId).map((s) => s.id).join(',');
  const columns = useMemo(() => buildComparison(project, idKey ? idKey.split(',') : [], doorId), [project, idKey]);
  const crop = useCrop(columns, doorId);

  if (columns.length < 2) {
    return (
      <div className={styles.compareEmpty}>
        <p>Create at least one scenario to compare it with its source revision.</p>
        <Button onClick={() => setView('edit')}>Back to editing</Button>
      </div>
    );
  }

  return (
    <div className={styles.compare}>
      <div className={styles.compareHead}>
        <div>
          <p className={styles.eyebrow}>Alternative comparison · {doorId}</p>
          <h2 className={styles.compareTitle}>Same change, different consequences</h2>
        </div>
        <Button onClick={() => setView('edit')}>Back to editing</Button>
      </div>
      <div className={styles.compareGrid} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(240px, 1fr))` }}>
        {columns.map((col) => {
          const model = buildPlanModel(col.scene, analysisOf(col.scene), { selectedId: doorId });
          return (
            <article key={col.id} className={styles.compareCol} data-column={col.label} data-status={col.doorStatus} aria-labelledby={`col-${col.id}`}>
              <header className={styles.compareColHead}>
                <div>
                  <h3 id={`col-${col.id}`}>{col.label}</h3>
                  <p className={styles.muted}>{col.kind === 'scenario' ? col.name : col.name}</p>
                </div>
                <StatusBadge status={col.doorStatus} />
              </header>
              <div className={styles.compareThumb}>
                <PlanDrawing
                  model={model}
                  crop={crop}
                  mode="thumbnail"
                  focusDoorId={doorId}
                  title={`${col.label} plan detail`}
                  description={`${doorId} at ${col.hingeOffsetMm ?? '—'} mm: ${col.doorStatus}`}
                />
              </div>
              <dl className={styles.compareFacts}>
                <dt>Hinge position</dt>
                <dd className="mono" data-testid={`compare-hinge-${col.label}`}>
                  {col.hingeOffsetMm === null ? '—' : formatMm(col.hingeOffsetMm)}
                  {col.hingeDeltaMm ? <span className={styles.delta}> {formatSignedDelta(col.hingeDeltaMm)}</span> : null}
                </dd>
                <dt>Max opening</dt>
                <dd className="mono">{col.maxOpeningDeg === null ? '—' : `${formatDeg(col.maxOpeningDeg)} / 90°`}</dd>
                <dt>Governing pair</dt>
                <dd>
                  {col.governing ? (
                    <>
                      <span className="mono">{col.governing.furnitureId}</span>{' '}
                      <span className="mono">
                        {col.governing.separationMm === null
                          ? 'not evaluated'
                          : col.governing.separationMm < 0
                            ? `${formatMeasure(-col.governing.separationMm)} intrusion`
                            : `${formatMeasure(col.governing.separationMm)} clear`}
                      </span>
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
                <dt>Needs attention</dt>
                <dd>
                  {col.attentionPairs.length ? (
                    col.attentionPairs.map((p) => (
                      <span key={p.furnitureId} className={styles.inlineBadge}>
                        <StatusBadge status={p.status} size="sm" label={`${p.furnitureId}`} />
                      </span>
                    ))
                  ) : (
                    <span className={styles.muted}>Nothing</span>
                  )}
                </dd>
                <dt>Changed elements</dt>
                <dd className="mono">{col.changedElementIds.length ? col.changedElementIds.join(', ') : '—'}</dd>
                <dt>Documents to review</dt>
                <dd data-testid={`compare-docs-${col.label}`}>
                  {col.impacts.length ? (
                    <>
                      <StatusBadge status="REVIEW_REQUIRED" size="sm" label={String(col.impacts.length)} />{' '}
                      <span className="mono">{col.impacts.map((i) => i.documentId).join(', ')}</span>
                    </>
                  ) : (
                    <span className={styles.muted}>None</span>
                  )}
                </dd>
                <dt>Decision</dt>
                <dd>
                  {LIFECYCLE[col.lifecycle]}
                  {col.decision ? <span className={styles.muted}> · {col.decision.note}</span> : null}
                </dd>
                {col.remarks ? (
                  <>
                    <dt>Remarks</dt>
                    <dd>{col.remarks}</dd>
                  </>
                ) : null}
              </dl>
              {col.kind === 'scenario' ? (
                <div className={styles.compareActions}>
                  <Button
                    size="sm"
                    onClick={() => {
                      setActive(col.id);
                      setView('edit');
                    }}
                  >
                    Open
                  </Button>
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => {
                      setActive(col.id);
                      onOpenDecision();
                    }}
                  >
                    {col.lifecycle === 'draft' ? 'Review' : col.lifecycle === 'ready_for_review' ? 'Decide' : 'Receipt'}
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className={styles.compareNote}>
        Every value above is computed from each scenario&apos;s canonical scene. Document review persists for any alternative that changes D-101,
        even when its swing is clear.
      </p>
    </div>
  );
}
