'use client';

import { wallSegment } from '@/domain/geometry/frame';
import { formatMm } from '@/domain/format';
import { findWall, footprintBounds, locateElement } from '@/domain/model/lookup';
import type { Door, Furniture } from '@/domain/model/types';
import type { Edit } from '@/domain/revision/scenario';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { HingeSlider } from './HingeSlider';
import { NumberField } from './NumberField';
import styles from './inspector.module.css';

const START_NAME = { south: 'west', east: 'south', north: 'east', west: 'north' } as const;
const END_NAME = { south: 'east', east: 'north', north: 'west', west: 'south' } as const;
const STEPS = [-100, -10, 10, 100] as const;

/** Runs an edit through the store; returns a user-facing problem, or null when applied. */
function useRunEdit() {
  const view = useActiveView();
  const edit = useWorkspace((s) => s.edit);
  return (e: Edit): string | null => {
    if (!view.editable) {
      return view.kind === 'revision'
        ? 'Committed revisions are read-only. Start a new scenario to propose a change.'
        : 'This scenario is locked for review.';
    }
    return edit(e) ? null : (useWorkspace.getState().notice?.text ?? 'The change was rejected.');
  };
}

export function PositionSection() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const run = useRunEdit();
  const located = selectedId ? locateElement(view.scene, selectedId) : undefined;

  if (!located) {
    return (
      <section className={styles.section} aria-labelledby="position-title">
        <h2 id="position-title" className={styles.heading}>
          Position
        </h2>
        <p className={styles.muted}>Select a door to move it along its wall.</p>
      </section>
    );
  }

  const { room } = located;

  if (located.kind === 'furniture') {
    const item = located.element as Furniture;
    const b = footprintBounds(item);
    return (
      <section className={styles.section} aria-labelledby="position-title" data-inspector-position={item.id}>
        <h2 id="position-title" className={styles.heading}>
          Position
        </h2>
        <dl className={styles.facts}>
          <dt>Footprint x</dt>
          <dd className="mono">
            {formatMm(b.minX)} – {formatMm(b.maxX)}
          </dd>
          <dt>Footprint y</dt>
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

  const door = located.element as Door;
  const ra = view.analysis.rooms.find((r) => r.roomId === room.id);
  const status = ra?.doors.find((d) => d.doorId === door.id)?.status ?? 'PASS';
  const wall = findWall(room, door.wallId);
  const length = wall ? wallSegment(wall.side, room.widthMm, room.depthMm).length : 0;
  const startName = wall ? START_NAME[wall.side] : 'start';
  const endName = wall ? END_NAME[wall.side] : 'end';
  const range: readonly [number, number] =
    door.leafDirection === 'toward-end' ? [0, Math.max(0, length - door.leafWidthMm)] : [Math.min(door.leafWidthMm, length), length];
  const locked = !view.editable;

  return (
    <section className={styles.section} aria-labelledby="position-title" data-inspector-position={door.id}>
      <h2 id="position-title" className={styles.heading}>
        Position
      </h2>
      <NumberField
        label="Hinge position"
        aside={`from the ${startName} end`}
        value={door.hingeOffsetMm}
        disabled={locked}
        testId="hinge-input"
        size="lg"
        hint={`The leaf fits on the ${wall?.side ?? 'host'} wall between ${formatMm(range[0])} and ${formatMm(range[1])}.`}
        onCommit={(v) => run({ kind: 'door.hinge', doorId: door.id, hingeOffsetMm: v })}
      >
        <HingeSlider
          doorId={door.id}
          room={room}
          scene={view.scene}
          value={door.hingeOffsetMm}
          range={range}
          status={status}
          disabled={locked}
          wallSide={wall?.side ?? 'host'}
        />
        <div className={styles.nudges} role="group" aria-label="Nudge the hinge">
          {STEPS.map((step) => (
            <button
              key={step}
              type="button"
              className={styles.nudge}
              disabled={locked}
              data-wide={Math.abs(step) === 100 ? 'true' : 'false'}
              onClick={() => run({ kind: 'door.hinge', doorId: door.id, hingeOffsetMm: door.hingeOffsetMm + step })}
              aria-label={`${step > 0 ? 'Increase' : 'Decrease'} hinge position by ${Math.abs(step)} mm`}
            >
              <span className="mono">{step > 0 ? `+${step}` : `−${Math.abs(step)}`}</span>
            </button>
          ))}
        </div>
      </NumberField>
      <p className={styles.kbdHint}>
        On the plan, drag the blue hinge handle, or focus it and use <kbd>←</kbd> <kbd>→</kbd> (<kbd>Shift</kbd> 100 mm, <kbd>Alt</kbd> 1 mm).
      </p>

      <div className={styles.row}>
        <label className={styles.fieldLabel} htmlFor="handing">
          Handing
        </label>
        <select
          id="handing"
          className={styles.select}
          value={door.leafDirection}
          disabled={locked}
          onChange={(e) => run({ kind: 'door.leafDirection', doorId: door.id, leafDirection: e.target.value as Door['leafDirection'] })}
        >
          <option value="toward-end">Leaf closes toward the {endName}</option>
          <option value="toward-start">Leaf closes toward the {startName}</option>
        </select>
      </div>

      <details className={styles.disclosure}>
        <summary>
          <span>Leaf &amp; swing</span>
          <span className={styles.summaryMeta}>supported: 90°, inward</span>
        </summary>
        <div className={styles.disclosureBody}>
          <NumberField
            label="Leaf width"
            value={door.leafWidthMm}
            disabled={locked}
            hint="Swing radius of the leaf."
            testId="leaf-input"
            onCommit={(v) => run({ kind: 'door.leafWidth', doorId: door.id, leafWidthMm: v })}
          />
          <NumberField
            label="Swing angle"
            unit="°"
            value={door.swingDeg}
            disabled={locked}
            hint="Only 90° is analysed. Other angles report Unsupported, never Pass."
            onCommit={(v) => run({ kind: 'door.swingDeg', doorId: door.id, swingDeg: v })}
          />
          <div className={styles.row}>
            <label className={styles.fieldLabel} htmlFor="swing-side">
              Swing side
            </label>
            <select
              id="swing-side"
              className={styles.select}
              value={door.swingSide}
              disabled={locked}
              onChange={(e) => run({ kind: 'door.swingSide', doorId: door.id, swingSide: e.target.value as Door['swingSide'] })}
            >
              <option value="interior">Into the room (supported)</option>
              <option value="exterior">Out of the room (unsupported)</option>
            </select>
          </div>
        </div>
      </details>
    </section>
  );
}
