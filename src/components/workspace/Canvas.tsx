'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Layers, Lock, Map as MapIcon, PanelRightClose, PanelRightOpen, SquareSplitHorizontal } from 'lucide-react';
import { PlanView, type PlanInsets } from '@/components/plan/PlanView';
import { ConsequenceBanner } from './ConsequenceBanner';
import { Legend } from './Legend';
import { ModelViewport } from './ModelViewport';
import { useFocusConsequence } from './useConsequence';
import styles from './canvas.module.css';

export type CanvasMode = 'plan' | 'split' | 'model';
export type PlanExtent = 'room' | 'all';

/** Canvas widths where the banner fits beside the view switch (mirrored in canvas.module.css). */
const BANNER_INLINE_MIN = 1320;
const PHONE_MAX = 560;
const SPLIT_SIDE_BY_SIDE_MIN = 900;

/** Space the floating controls need, so the drawing is laid out around them instead of under them. */
function planInsets(width: number, mode: CanvasMode, coach: boolean): PlanInsets {
  if (width < PHONE_MAX) return { top: 108, right: 8, bottom: 34, left: 8 };
  const top = width >= BANNER_INLINE_MIN ? 66 : 106;
  const coachBelow = coach && (mode === 'plan' || width < SPLIT_SIDE_BY_SIDE_MIN);
  return { top, right: 16, bottom: coachBelow && mode === 'plan' ? 118 : 54, left: 16 };
}

const MODES: { id: CanvasMode; label: string; icon: ReactNode }[] = [
  { id: 'plan', label: 'Plan', icon: <MapIcon size={14} aria-hidden="true" /> },
  { id: 'split', label: 'Split', icon: <SquareSplitHorizontal size={14} aria-hidden="true" /> },
  { id: 'model', label: 'Model', icon: <Box size={14} aria-hidden="true" /> },
];

export function Canvas({
  mode,
  onMode,
  extent,
  onExtent,
  layersExpanded,
  onToggleLayers,
  inspectorOpen,
  onToggleInspector,
  coach,
  readOnlyLabel,
}: {
  mode: CanvasMode;
  onMode: (mode: CanvasMode) => void;
  extent: PlanExtent;
  onExtent: (extent: PlanExtent) => void;
  layersExpanded: boolean;
  onToggleLayers: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  /** Coach card for wide layouts (rendered bottom-right); null when hidden. */
  coach: ReactNode;
  /** Shown as a chip when the active view cannot be edited. */
  readOnlyLabel: string | null;
}) {
  const { consequence } = useFocusConsequence();
  const ref = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const insets = planInsets(width, mode, Boolean(coach));

  return (
    <section ref={ref} className={styles.canvas} aria-label="Plan and model" data-mode={mode}>
      <div className={styles.stage} data-mode={mode}>
        {mode !== 'model' ? (
          <div className={styles.planPane}>
            <PlanView extent={extent} insets={insets} footer={<Legend />} />
          </div>
        ) : null}
        {mode !== 'plan' ? (
          <div className={styles.modelPane} style={{ paddingTop: mode === 'model' || width >= SPLIT_SIDE_BY_SIDE_MIN ? insets.top - 10 : 0 }}>
            <ModelViewport />
          </div>
        ) : null}
      </div>

      <div className={styles.topLeft}>
        <button
          type="button"
          className={styles.toolButton}
          onClick={onToggleLayers}
          aria-expanded={layersExpanded}
          aria-label={layersExpanded ? 'Hide layers' : 'Show layers'}
          title={layersExpanded ? 'Hide layers' : 'Show layers'}
          data-testid="layers-toggle"
        >
          <Layers size={15} aria-hidden="true" />
        </button>
        <div className={styles.modeSwitch} role="group" aria-label="Canvas view">
          {MODES.map((m) => (
            <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => onMode(m.id)} data-mode={m.id}>
              {m.icon}
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.topRight}>
        {readOnlyLabel ? (
          <span className={styles.readOnly}>
            <Lock size={12} aria-hidden="true" />
            {readOnlyLabel}
          </span>
        ) : null}
        {mode !== 'model' ? (
          <div className={styles.extentSwitch} role="group" aria-label="Plan extent">
            <button type="button" aria-pressed={extent === 'room'} onClick={() => onExtent('room')}>
              {consequence?.room.id ?? 'Room'}
            </button>
            <button type="button" aria-pressed={extent === 'all'} onClick={() => onExtent('all')}>
              All rooms
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={`${styles.toolButton} ${styles.inspectorToggle}`}
          onClick={onToggleInspector}
          aria-expanded={inspectorOpen}
          aria-label={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
          title={inspectorOpen ? 'Hide inspector' : 'Show inspector'}
        >
          {inspectorOpen ? <PanelRightClose size={15} aria-hidden="true" /> : <PanelRightOpen size={15} aria-hidden="true" />}
        </button>
      </div>

      <div className={styles.bannerSlot}>
        <ConsequenceBanner consequence={consequence} />
      </div>

      {coach ? <div className={styles.coachSlot}>{coach}</div> : null}
    </section>
  );
}
