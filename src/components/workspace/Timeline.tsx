'use client';

import { describeFieldChange, diffScenes } from '@/domain/revision/diff';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import styles from './workspace.module.css';

export function Timeline() {
  const view = useActiveView();
  const undo = useWorkspace((s) => s.undo);
  const redo = useWorkspace((s) => s.redo);
  const project = useWorkspace((s) => s.project);
  const scenario = view.scenario;

  if (!scenario) {
    return (
      <div className={styles.timeline} aria-label="Revision history">
        <span className={styles.timelineLabel}>History</span>
        <ol className={styles.timelineList}>
          {project.revisions.map((r) => (
            <li key={r.id} className={styles.timelineItem} data-state="past">
              <span className="mono">{r.id}</span> {r.summary}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const snapshots = [...scenario.past, scenario.scene, ...scenario.future];
  const current = scenario.past.length;
  const steps = snapshots.slice(1).map((snap, i) => {
    const changes = diffScenes(snapshots[i]!, snap).fields;
    return changes.length ? changes.map(describeFieldChange).join('; ') : 'No geometric change';
  });
  const jump = (target: number) => {
    const delta = target - current;
    for (let i = 0; i < Math.abs(delta); i += 1) {
      if (delta < 0) undo();
      else redo();
    }
  };

  return (
    <div className={styles.timeline} aria-label="Scenario timeline">
      <span className={styles.timelineLabel}>Revision {scenario.label} timeline</span>
      <ol className={styles.timelineList}>
        <li className={styles.timelineItem} data-state={current === 0 ? 'current' : 'past'}>
          <button type="button" onClick={() => jump(0)} disabled={!view.editable || current === 0}>
            <span className="mono">{scenario.sourceRevisionId}</span> source
          </button>
        </li>
        {steps.map((label, i) => (
          <li key={i} className={styles.timelineItem} data-state={i + 1 === current ? 'current' : i + 1 < current ? 'past' : 'future'}>
            <button type="button" onClick={() => jump(i + 1)} disabled={!view.editable || i + 1 === current}>
              <span className="mono">{label}</span>
            </button>
          </li>
        ))}
        {scenario.status !== 'draft' ? (
          <li className={styles.timelineItem} data-state="decision">
            <span>{scenario.status === 'ready_for_review' ? 'Submitted for review' : scenario.status.replace(/_/g, ' ')}</span>
          </li>
        ) : null}
      </ol>
    </div>
  );
}
