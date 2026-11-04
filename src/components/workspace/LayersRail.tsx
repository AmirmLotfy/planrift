'use client';

import { StatusIcon } from '@/components/ui/StatusBadge';
import { worstStatus, type PairStatus } from '@/domain/analysis/analyze';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import styles from './layers.module.css';

/**
 * Element tree for the rooms in the active scene. Statuses are read from the analysis; a
 * furniture row shows the worst status of the pairs it takes part in.
 */
export function LayersRail({ onPicked }: { onPicked?: () => void }) {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const select = useWorkspace((s) => s.select);
  const impacts = view.evaluation?.impacts ?? [];
  const changed = new Set(view.evaluation?.diff.fields.map((f) => f.elementId) ?? []);
  const pick = (id: string) => {
    select(id);
    onPicked?.();
  };

  return (
    <div className={styles.rail}>
      {view.scene.rooms.map((room) => {
        const ra = view.analysis.rooms.find((r) => r.roomId === room.id);
        if (!ra) return null;
        const worst = (id: string): PairStatus => worstStatus(ra.pairs.filter((p) => p.furnitureId === id).map((p) => p.status));
        const roomChanged = view.evaluation?.diff.fields.some((f) => f.roomId === room.id) ?? false;
        return (
          <section key={room.id} className={styles.room} aria-labelledby={`layers-${room.id}`}>
            <h3 id={`layers-${room.id}`} className={styles.roomHead}>
              <StatusIcon status={ra.status} size={12} />
              <span className="mono">{room.id}</span>
              <span className={styles.roomName}>{room.name}</span>
              <span className="visually-hidden">: {STATUS_LABEL[ra.status]}</span>
            </h3>
            {view.kind === 'scenario' && !roomChanged ? <p className={styles.note}>Unchanged in this scenario</p> : null}
            <ul className={styles.list}>
              {room.doors.map((door) => {
                const status = ra.doors.find((d) => d.doorId === door.id)?.status ?? 'PASS';
                return (
                  <li key={door.id}>
                    <button
                      type="button"
                      className={styles.item}
                      aria-pressed={selectedId === door.id}
                      onClick={() => pick(door.id)}
                      data-element={door.id}
                    >
                      <StatusIcon status={status} size={12} />
                      <span className={`mono ${styles.id}`}>{door.id}</span>
                      <span className={styles.name}>{door.name}</span>
                      {changed.has(door.id) ? <span className={styles.changed}>changed</span> : null}
                      <span className="visually-hidden">, {STATUS_LABEL[status]}</span>
                    </button>
                  </li>
                );
              })}
              {room.furniture.map((item) => {
                const status = worst(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={styles.item}
                      aria-pressed={selectedId === item.id}
                      onClick={() => pick(item.id)}
                      data-element={item.id}
                    >
                      <StatusIcon status={status} size={12} />
                      <span className={`mono ${styles.id}`}>{item.id}</span>
                      <span className={styles.name}>{item.name}</span>
                      {changed.has(item.id) ? <span className={styles.changed}>changed</span> : null}
                      <span className="visually-hidden">, {STATUS_LABEL[status]}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <section className={styles.room} aria-labelledby="layers-sheets">
        <h3 id="layers-sheets" className={styles.roomHead}>
          <span className={styles.roomName}>Linked sheets</span>
        </h3>
        <ul className={styles.list}>
          {view.scene.documents.map((doc) => {
            const flagged = impacts.some((i) => i.documentId === doc.id);
            return (
              <li key={doc.id} className={styles.doc} data-document={doc.id} data-flagged={flagged ? 'true' : 'false'}>
                <span className={`mono ${styles.docId}`}>{doc.id}</span>
                <span className={styles.name} title={doc.title}>
                  {doc.title}
                </span>
                <span className={styles.docState}>{flagged ? 'review' : `rev ${doc.revision}`}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
