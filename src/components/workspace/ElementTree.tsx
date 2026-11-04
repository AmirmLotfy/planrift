'use client';

import { StatusIcon, StatusBadge } from '@/components/ui/StatusBadge';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import type { PairStatus } from '@/domain/analysis/analyze';
import styles from './workspace.module.css';

const ORDER: PairStatus[] = ['INVALID', 'CONFLICT', 'UNSUPPORTED', 'CONTACT_REVIEW', 'NEAR_CLEARANCE', 'PASS'];

export function ElementTree() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const select = useWorkspace((s) => s.select);
  const impacts = view.evaluation?.impacts ?? [];
  const changed = new Set(view.evaluation?.diff.fields.map((f) => f.elementId) ?? []);

  return (
    <div className={styles.tree}>
      <h2 className={styles.railHeading}>Rooms</h2>
      {view.scene.rooms.map((room) => {
        const ra = view.analysis.rooms.find((r) => r.roomId === room.id)!;
        const worst = (id: string) =>
          ra.pairs.filter((p) => p.furnitureId === id || p.doorId === id).reduce<PairStatus>((w, p) => (ORDER.indexOf(p.status) < ORDER.indexOf(w) ? p.status : w), 'PASS');
        const roomChanged = view.evaluation?.diff.fields.some((f) => f.roomId === room.id) ?? false;
        return (
          <section key={room.id} className={styles.treeRoom} aria-label={`${room.id} ${room.name}`}>
            <div className={styles.treeRoomHead}>
              <div>
                <span className="mono">{room.id}</span>
                <span className={styles.treeRoomName}>{room.name}</span>
              </div>
              <StatusBadge status={ra.status} size="sm" />
            </div>
            {!roomChanged && view.kind === 'scenario' ? <p className={styles.treeNote}>Unchanged in this scenario</p> : null}
            <ul className={styles.treeList}>
              {room.doors.map((door) => (
                <li key={door.id}>
                  <button
                    type="button"
                    className={styles.treeItem}
                    aria-pressed={selectedId === door.id}
                    onClick={() => select(door.id)}
                    data-element={door.id}
                  >
                    <StatusIcon status={ra.doors.find((d) => d.doorId === door.id)?.status ?? 'PASS'} size={12} />
                    <span className="mono">{door.id}</span>
                    <span className={styles.treeItemName}>{door.name}</span>
                    {changed.has(door.id) ? <span className={styles.changedDot} title="Changed in this scenario">changed</span> : null}
                  </button>
                </li>
              ))}
              {room.furniture.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={styles.treeItem}
                    aria-pressed={selectedId === item.id}
                    onClick={() => select(item.id)}
                    data-element={item.id}
                  >
                    <StatusIcon status={worst(item.id)} size={12} />
                    <span className="mono">{item.id}</span>
                    <span className={styles.treeItemName}>{item.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      <h2 className={styles.railHeading}>Documents</h2>
      <ul className={styles.treeList}>
        {view.scene.documents.map((doc) => {
          const flagged = impacts.some((i) => i.documentId === doc.id);
          return (
            <li key={doc.id} className={styles.docItem} data-document={doc.id}>
              <StatusIcon status={flagged ? 'REVIEW_REQUIRED' : 'PASS'} size={12} />
              <span className="mono">{doc.id}</span>
              <span className={styles.treeItemName}>{doc.title}</span>
              <span className={styles.docRev}>rev {doc.revision}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
