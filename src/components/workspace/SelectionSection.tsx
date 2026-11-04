'use client';

import { Lock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { wallSegment } from '@/domain/geometry/frame';
import { formatMm } from '@/domain/format';
import { findWall, locateElement } from '@/domain/model/lookup';
import type { Door, Furniture } from '@/domain/model/types';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { LIFECYCLE_LABEL } from './lifecycle';
import styles from './inspector.module.css';

const CATEGORY: Record<Furniture['category'], string> = {
  bed: 'Bed',
  nightstand: 'Nightstand',
  desk: 'Desk',
  chair: 'Chair',
  'lounge-chair': 'Lounge chair',
  console: 'Console',
  wardrobe: 'Wardrobe',
  'media-unit': 'Media unit',
  table: 'Table',
  other: 'Furniture',
};

function LockNote() {
  const view = useActiveView();
  const newScenario = useWorkspace((s) => s.newScenario);
  if (view.editable) return null;
  if (view.kind === 'revision') {
    return (
      <div className={styles.lockNote}>
        <Lock size={14} aria-hidden="true" />
        <p>
          Committed revision, read-only. Start a scenario to propose a change.
          <button type="button" className={styles.linkButton} onClick={() => newScenario()}>
            Start a scenario
          </button>
        </p>
      </div>
    );
  }
  const status = view.scenario!.status;
  return (
    <div className={styles.lockNote}>
      <Lock size={14} aria-hidden="true" />
      <p>
        Revision {view.scenario!.label} is {LIFECYCLE_LABEL[status].toLowerCase()} and locked.
        {status === 'ready_for_review' ? ' Return it to draft from Decision to edit.' : ''}
      </p>
    </div>
  );
}

export function SelectionSection() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const located = selectedId ? locateElement(view.scene, selectedId) : undefined;

  if (!located) {
    return (
      <section className={styles.section} aria-labelledby="selection-title">
        <h2 id="selection-title" className={styles.heading}>
          Selection
        </h2>
        <p className={styles.muted}>Nothing selected. Pick a door or a furniture item on the plan or in Layers.</p>
        <LockNote />
      </section>
    );
  }

  const { room } = located;
  const ra = view.analysis.rooms.find((r) => r.roomId === room.id);

  if (located.kind === 'door') {
    const door = located.element as Door;
    const status = ra?.doors.find((d) => d.doorId === door.id)?.status ?? 'PASS';
    const wall = findWall(room, door.wallId);
    const length = wall ? wallSegment(wall.side, room.widthMm, room.depthMm).length : 0;
    return (
      <section className={styles.section} aria-labelledby="selection-title" data-inspector={door.id}>
        <h2 id="selection-title" className="visually-hidden">
          Selection
        </h2>
        <div className={styles.identity}>
          <div className={styles.identityText}>
            <p className={`mono ${styles.bigId}`}>{door.id}</p>
            <p className={styles.elementName}>{door.name}</p>
          </div>
          <StatusBadge status={status} />
        </div>
        <p className={styles.hostLine}>
          {wall ? (
            <>
              {wall.side[0]!.toUpperCase()}
              {wall.side.slice(1)} wall <span className="mono">{wall.id}</span> · <span className="mono">{formatMm(length)}</span>
            </>
          ) : (
            'Host wall missing'
          )}{' '}
          · single-leaf hinged · <span className="mono">{room.id}</span>
        </p>
        <LockNote />
      </section>
    );
  }

  const item = located.element as Furniture;
  const fa = ra?.furniture.find((f) => f.furnitureId === item.id);
  const status =
    fa?.validity === 'VALID' || !fa ? (ra?.pairs.find((p) => p.furnitureId === item.id && p.status !== 'PASS')?.status ?? 'PASS') : fa.validity;
  return (
    <section className={styles.section} aria-labelledby="selection-title" data-inspector={item.id}>
      <h2 id="selection-title" className="visually-hidden">
        Selection
      </h2>
      <div className={styles.identity}>
        <div className={styles.identityText}>
          <p className={`mono ${styles.bigId}`}>{item.id}</p>
          <p className={styles.elementName}>{item.name}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className={styles.hostLine}>
        {CATEGORY[item.category]} · <span className="mono">{formatMm(item.heightMm)}</span> high · <span className="mono">{room.id}</span>
      </p>
      <LockNote />
    </section>
  );
}
