'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { STATUS_LABEL, explainDoor } from '@/domain/analysis/explain';
import { formatMm } from '@/domain/format';
import { findDoor } from '@/domain/model/lookup';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import styles from './shell.module.css';

/** Announces analysis results politely, debounced so drags do not flood screen readers. */
export function LiveRegion() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const doorId = selectedId && findDoor(view.scene, selectedId) ? selectedId : 'D-101';
  const sentence = useMemo(() => {
    const found = findDoor(view.scene, doorId);
    const door = view.analysis.rooms.flatMap((r) => r.doors).find((d) => d.doorId === doorId);
    if (!found || !door) return '';
    const conflicts = view.analysis.rooms.flatMap((r) => r.pairs).filter((p) => p.doorId === doorId && p.status === 'CONFLICT').length;
    return `${doorId} at ${formatMm(found.door.hingeOffsetMm)}: ${STATUS_LABEL[door.status]}. ${explainDoor(door, conflicts)}`;
  }, [view, doorId]);
  const [announced, setAnnounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setAnnounced(sentence), 450);
    return () => clearTimeout(t);
  }, [sentence]);
  return (
    <div className="visually-hidden" aria-live="polite" aria-atomic="true" data-testid="live-region">
      {announced}
    </div>
  );
}

export function NoticeToast() {
  const notice = useWorkspace((s) => s.notice);
  const dismiss = useWorkspace((s) => s.dismissNotice);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(dismiss, notice.kind === 'error' ? 7000 : 4500);
    return () => clearTimeout(t);
  }, [notice, dismiss]);
  if (!notice) return null;
  return (
    <div className={styles.toast} data-kind={notice.kind} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss notice">
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
