'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { PairStatus } from '@/domain/analysis/analyze';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatMm } from '@/domain/format';
import type { Room, Scene } from '@/domain/model/types';
import { hingeMapOf, useWorkspace } from '@/state/store';
import styles from './inspector.module.css';

/** Slider steps match the plan drag snap (10 mm); the number field accepts any whole millimetre. */
const STEP_MM = 10;

/**
 * Range slider over the drag range of a door hinge. Moving it previews the edit (no undo step
 * per pixel) and the native `change` event (pointer release, or each key press) commits it,
 * exactly like dragging the handle on the plan. The track is painted with the computed hinge
 * map, so the consequence of every position is visible before you get there.
 */
export function HingeSlider({
  doorId,
  room,
  scene,
  value,
  range,
  status,
  disabled,
  wallSide,
}: {
  doorId: string;
  room: Room;
  scene: Scene;
  value: number;
  range: readonly [number, number];
  status: PairStatus;
  disabled: boolean;
  wallSide: string;
}) {
  const previewEdit = useWorkspace((s) => s.previewEdit);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lo, hi] = range;
  const span = Math.max(1, hi - lo);
  const map = useMemo(() => hingeMapOf(room, doorId, scene), [room, doorId, scene]);
  const bands = useMemo(
    () =>
      (map?.segments ?? [])
        .map((s) => ({ from: Math.max(lo, s.fromMm), to: Math.min(hi, s.toMm + 1), status: s.status }))
        .filter((b) => b.to > b.from),
    [map, lo, hi],
  );

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    const commit = () => useWorkspace.getState().commitPreview();
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, []);

  return (
    <div className={styles.slider} data-disabled={disabled ? 'true' : 'false'}>
      <div className={styles.sliderTrack} aria-hidden="true">
        {bands.map((band) => (
          <span
            key={`${band.from}-${band.status}`}
            className={styles.band}
            data-status={band.status}
            style={{ left: `${((band.from - lo) / span) * 100}%`, width: `${((band.to - band.from) / span) * 100}%` }}
          />
        ))}
      </div>
      <input
        ref={inputRef}
        type="range"
        className={styles.range}
        min={lo}
        max={hi}
        step={STEP_MM}
        value={Math.min(hi, Math.max(lo, value))}
        disabled={disabled}
        aria-label={`${doorId} hinge position along the ${wallSide} wall`}
        aria-valuetext={`${formatMm(value)}, ${STATUS_LABEL[status]}`}
        onChange={(e) => previewEdit({ kind: 'door.hinge', doorId, hingeOffsetMm: Number(e.target.value) })}
        onBlur={() => useWorkspace.getState().commitPreview()}
        data-testid="hinge-slider"
      />
      <div className={styles.sliderScale} aria-hidden="true">
        <span className="mono">{formatMm(lo)}</span>
        <span className={styles.sliderLegend}>hinge map</span>
        <span className="mono">{formatMm(hi)}</span>
      </div>
    </div>
  );
}
