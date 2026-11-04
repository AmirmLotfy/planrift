'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { fieldStyles } from '@/components/ui/primitives';
import { wallSegment } from '@/domain/geometry/frame';
import { formatMm } from '@/domain/format';
import { findWall, footprintBounds, locateElement } from '@/domain/model/lookup';
import type { Door, Furniture } from '@/domain/model/types';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { NumberField } from './NumberField';
import styles from './workspace.module.css';

const START_NAME = { south: 'west', east: 'south', north: 'east', west: 'north' } as const;

export function Inspector() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const edit = useWorkspace((s) => s.edit);
  const located = selectedId ? locateElement(view.scene, selectedId) : undefined;

  if (!located) {
    return (
      <section className={styles.panel} aria-labelledby="inspector-title">
        <h2 id="inspector-title" className={styles.panelTitle}>Inspector</h2>
        <p className={styles.muted}>Select a door or furniture item in the plan or the element list.</p>
      </section>
    );
  }

  const { room } = located;
  const ra = view.analysis.rooms.find((r) => r.roomId === room.id)!;
  const run = (e: Parameters<typeof edit>[0]): string | null => {
    if (!view.editable) return view.kind === 'revision' ? 'Committed revisions are read-only. Start a new scenario to propose a change.' : 'This scenario is locked for review.';
    return edit(e) ? null : (useWorkspace.getState().notice?.text ?? 'The change was rejected.');
  };

  if (located.kind === 'door') {
    const door = located.element as Door;
    const da = ra.doors.find((d) => d.doorId === door.id)!;
    const wall = findWall(room, door.wallId);
    const length = wall ? wallSegment(wall.side, room.widthMm, room.depthMm).length : 0;
    const startName = wall ? START_NAME[wall.side] : 'start';
    const range = door.leafDirection === 'toward-end' ? [0, length - door.leafWidthMm] : [door.leafWidthMm, length];
    return (
      <section className={styles.panel} aria-labelledby="inspector-title" data-inspector={door.id}>
        <div className={styles.panelHead}>
          <div>
            <p className={styles.eyebrow}>Door · {room.id}</p>
            <h2 id="inspector-title" className={styles.panelTitle}>
              <span className="mono">{door.id}</span> {door.name}
            </h2>
          </div>
          <StatusBadge status={da.status} />
        </div>
        <p className={styles.muted}>
          {wall ? `${wall.side[0]!.toUpperCase()}${wall.side.slice(1)} wall ${wall.id} · ${formatMm(length)}` : 'Host wall missing'} · single-leaf hinged
        </p>
        {!view.editable ? (
          <p className={styles.lockNote}>
            {view.kind === 'revision' ? 'Viewing a committed revision. Create a scenario (header → New scenario) to edit.' : 'Locked while in review or decided.'}
          </p>
        ) : null}
        <NumberField
          label="Hinge position"
          value={door.hingeOffsetMm}
          disabled={!view.editable}
          steps={[-100, -10, 10, 100]}
          testId="hinge-input"
          hint={`From the ${startName} end of the wall. The leaf fits between ${formatMm(Math.max(0, range[0]!))} and ${formatMm(Math.max(0, range[1]!))}.`}
          onCommit={(v) => run({ kind: 'door.hinge', doorId: door.id, hingeOffsetMm: v })}
        />
        <NumberField
          label="Leaf width"
          value={door.leafWidthMm}
          disabled={!view.editable}
          hint="Swing radius of the leaf."
          testId="leaf-input"
          onCommit={(v) => run({ kind: 'door.leafWidth', doorId: door.id, leafWidthMm: v })}
        />
        <div className={fieldStyles.field}>
          <label className={fieldStyles.fieldLabel} htmlFor="handing">
            Handing
          </label>
          <select
            id="handing"
            className={fieldStyles.input}
            value={door.leafDirection}
            disabled={!view.editable}
            onChange={(e) => run({ kind: 'door.leafDirection', doorId: door.id, leafDirection: e.target.value as Door['leafDirection'] })}
          >
            <option value="toward-end">Leaf closes toward the {wall ? { south: 'east', east: 'north', north: 'west', west: 'south' }[wall.side] : 'end'}</option>
            <option value="toward-start">Leaf closes toward the {startName}</option>
          </select>
        </div>
        <details className={styles.advanced}>
          <summary>Swing settings (supported model: 90°, inward)</summary>
          <NumberField
            label="Swing angle"
            unit="°"
            value={door.swingDeg}
            disabled={!view.editable}
            hint="Only 90° is analysed. Other angles report Unsupported, never Pass."
            onCommit={(v) => run({ kind: 'door.swingDeg', doorId: door.id, swingDeg: v })}
          />
          <div className={fieldStyles.field}>
            <label className={fieldStyles.fieldLabel} htmlFor="swing-side">
              Swing side
            </label>
            <select
              id="swing-side"
              className={fieldStyles.input}
              value={door.swingSide}
              disabled={!view.editable}
              onChange={(e) => run({ kind: 'door.swingSide', doorId: door.id, swingSide: e.target.value as Door['swingSide'] })}
            >
              <option value="interior">Into the room (supported)</option>
              <option value="exterior">Out of the room (unsupported)</option>
            </select>
          </div>
        </details>
      </section>
    );
  }

  const item = located.element as Furniture;
  const b = footprintBounds(item);
  const fa = ra.furniture.find((f) => f.furnitureId === item.id);
  return (
    <section className={styles.panel} aria-labelledby="inspector-title" data-inspector={item.id}>
      <div className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>Furniture · {room.id}</p>
          <h2 id="inspector-title" className={styles.panelTitle}>
            <span className="mono">{item.id}</span> {item.name}
          </h2>
        </div>
        <StatusBadge status={fa?.validity === 'VALID' ? (ra.pairs.find((p) => p.furnitureId === item.id && p.status !== 'PASS')?.status ?? 'PASS') : (fa?.validity ?? 'PASS')} />
      </div>
      <dl className={styles.facts}>
        <dt>Footprint X</dt>
        <dd className="mono">
          {formatMm(b.minX)} – {formatMm(b.maxX)}
        </dd>
        <dt>Footprint Y</dt>
        <dd className="mono">
          {formatMm(b.minY)} – {formatMm(b.maxY)}
        </dd>
        <dt>Size</dt>
        <dd className="mono">
          {formatMm(b.maxX - b.minX)} × {formatMm(b.maxY - b.minY)} × {formatMm(item.heightMm)}
        </dd>
        <dt>Shape</dt>
        <dd>{item.footprint.kind === 'rect' ? 'Axis-aligned rectangle' : item.footprint.kind}</dd>
      </dl>
      <p className={styles.muted}>Furniture positions are fixed in this demo; the door is the element under revision.</p>
    </section>
  );
}
