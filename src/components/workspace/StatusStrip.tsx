'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatMeasure, formatMm } from '@/domain/format';
import { useFocusConsequence } from './useConsequence';
import styles from './shell.module.css';

/** Phone status strip under the canvas: door, hinge, status and the governing distance. */
export function StatusStrip() {
  const { consequence } = useFocusConsequence();
  if (!consequence) return <div className={styles.strip} />;
  const { door, analysis, governing } = consequence;
  const sep = governing?.separation?.valueMm ?? null;
  return (
    <div className={styles.strip} data-status={analysis.status} data-testid="status-strip">
      <span className={styles.stripDoor}>
        <span className="mono">{door.id}</span>
        <span className={styles.stripName}>{door.name}</span>
      </span>
      <span className={`mono ${styles.stripHinge}`}>{formatMm(door.hingeOffsetMm)}</span>
      {sep !== null ? (
        <span className={styles.stripFigure}>
          {sep < 0 ? 'intrusion' : 'clear'} <b className="mono">{formatMeasure(Math.abs(sep))}</b>
        </span>
      ) : null}
      <StatusBadge status={analysis.status} size="sm" />
    </div>
  );
}
