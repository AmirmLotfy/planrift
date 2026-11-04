'use client';

import { formatMm } from '@/domain/format';
import { describeFieldChange, diffScenes, type FieldChange } from '@/domain/revision/diff';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { LIFECYCLE_LABEL } from './lifecycle';
import styles from './timeline.module.css';

/** Short chip text for one change; the full sentence stays in the accessible name and tooltip. */
function shortChange(c: FieldChange): string {
  if (typeof c.after === 'number' && c.field.endsWith('Mm')) return `${c.elementId} ${formatMm(c.after)}`;
  if (c.field === 'swingDeg') return `${c.elementId} ${String(c.after)}°`;
  return `${c.elementId} ${String(c.after)}`;
}

export function Timeline() {
  const view = useActiveView();
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const project = useWorkspace((s) => s.project);
  const scenario = view.scenario;

  if (!scenario) {
    return (
      <nav className={styles.timeline} aria-label="Revision history">
        <span className={styles.label}>History</span>
        <ol className={styles.list}>
          {project.revisions.map((r) => (
            <li key={r.id} className={styles.item} data-state="past">
              <span className={styles.static}>
                <span className="mono">{r.id}</span> {r.summary}
              </span>
            </li>
          ))}
        </ol>
      </nav>
    );
  }

  const snapshots = [...scenario.past, scenario.scene, ...scenario.future];
  const current = scenario.past.length;
  const steps = snapshots.slice(1).map((snap, i) => {
    const changes = diffScenes(snapshots[i]!, snap).fields;
    return {
      short: changes.length ? changes.map(shortChange).join(' · ') : 'No geometric change',
      full: changes.length ? changes.map(describeFieldChange).join('; ') : 'No geometric change',
    };
  });
  const jump = (target: number) => {
    const delta = target - current;
    for (let i = 0; i < Math.abs(delta); i += 1) {
      if (delta < 0) undo();
      else redo();
    }
  };

  return (
    <nav className={styles.timeline} aria-label={`Revision ${scenario.label} timeline`}>
      <span className={styles.label}>
        Revision {scenario.label} · {steps.length} step{steps.length === 1 ? '' : 's'}
      </span>
      <ol className={styles.list}>
        <li className={styles.item} data-state={current === 0 ? 'current' : 'past'}>
          <button
            type="button"
            onClick={() => jump(0)}
            disabled={!view.editable || current === 0}
            aria-current={current === 0 ? 'step' : undefined}
            aria-label={`Source revision ${scenario.sourceRevisionId}`}
          >
            <span className="mono">{scenario.sourceRevisionId}</span> source
          </button>
        </li>
        {steps.map((step, i) => (
          <li key={i} className={styles.item} data-state={i + 1 === current ? 'current' : i + 1 < current ? 'past' : 'future'}>
            <button
              type="button"
              onClick={() => jump(i + 1)}
              disabled={!view.editable || i + 1 === current}
              aria-current={i + 1 === current ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${step.full}${i + 1 > current ? ' (undone)' : ''}`}
              title={step.full}
            >
              <span className="mono">{step.short}</span>
            </button>
          </li>
        ))}
        {scenario.status !== 'draft' ? (
          <li className={styles.item} data-state="decision">
            <span className={styles.static}>{scenario.status === 'ready_for_review' ? 'Submitted for review' : LIFECYCLE_LABEL[scenario.status]}</span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
