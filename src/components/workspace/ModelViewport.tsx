'use client';

/**
 * The studio's 3D view: the same white model as the landing page, fed by the active view.
 * Dragging the door previews the edit live (like the plan) and commits it on release; committed
 * revisions and locked scenarios are shown read-only. Camera presets: overview, door, top.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDrive } from '@/components/scene/drive';
import type { CameraPose } from '@/components/scene/posing';
import { usePrefersReducedMotion, useWebGLSupport } from '@/components/ui/useBrowser';
import { doorAnalysis } from '@/domain/analysis/analyze';
import { explainDoor } from '@/domain/analysis/explain';
import { formatMm } from '@/domain/format';
import { findDoor } from '@/domain/model/lookup';
import { useActiveView } from '@/state/hooks';
import { hingeMapOf, useWorkspace } from '@/state/store';
import { MOBILE_QUERY, useMediaQuery } from './useMediaQuery';
import styles from './canvas.module.css';

const WhiteModel = dynamic(() => import('@/components/scene/WhiteModel'), {
  ssr: false,
  loading: () => <div className={styles.modelLoading}>Loading the 3D model…</div>,
});

const PRESETS: { id: CameraPose; label: string }[] = [
  { id: 'hero', label: 'Overview' },
  { id: 'door', label: 'Door' },
  { id: 'plan', label: 'Top' },
];

export function ModelViewport() {
  const view = useActiveView();
  const selectedId = useWorkspace((s) => s.selectedId);
  const previewEdit = useWorkspace((s) => s.previewEdit);
  const commitPreview = useWorkspace((s) => s.commitPreview);
  const webgl = useWebGLSupport();
  const reduced = usePrefersReducedMotion();
  const phone = useMediaQuery(MOBILE_QUERY);
  const [pose, setPose] = useState<CameraPose>('hero');
  const drive = useMemo(() => createDrive({ from: 'hero', to: 'hero' }), []);
  useEffect(() => drive.set({ from: pose, to: pose, t: 0 }), [drive, pose]);

  const focusDoorId = selectedId && findDoor(view.scene, selectedId) ? selectedId : 'D-101';
  const located = findDoor(view.scene, focusDoorId) ?? null;
  const roomId = located?.room.id ?? view.scene.rooms[0]!.id;
  const map = located ? hingeMapOf(located.room, focusDoorId, view.scene) : null;
  const door = doorAnalysis(view.analysis, focusDoorId);
  const summary = door && located ? `${focusDoorId} at ${formatMm(located.door.hingeOffsetMm)}: ${explainDoor(door, 0)}` : 'Study model';

  const onHinge = useCallback((mm: number) => previewEdit({ kind: 'door.hinge', doorId: focusDoorId, hingeOffsetMm: mm }), [previewEdit, focusDoorId]);
  const onDrag = useCallback((dragging: boolean) => (dragging ? undefined : commitPreview()), [commitPreview]);

  if (webgl === false) {
    return (
      <div className={styles.modelViewport} data-testid="model-viewport">
        <p className={styles.modelLoading} role="note">
          3D needs WebGL, which this browser has turned off. The plan, results and documents are computed independently and are unaffected.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.modelViewport} data-testid="model-viewport" data-pose={pose}>
      {webgl ? (
        <WhiteModel
          scene={view.scene}
          analysis={view.analysis}
          focusRoomId={roomId}
          doorId={focusDoorId}
          drive={drive}
          hingeMap={map}
          interactive={view.editable}
          onHingeChange={onHinge}
          onDragChange={onDrag}
          intro={!reduced}
          quality={phone ? 'low' : 'high'}
          ariaLabel={`3D study model of ${roomId}. ${summary}`}
        />
      ) : null}
      <div className={styles.modelPresets} role="group" aria-label="Camera">
        {PRESETS.map((p) => (
          <button key={p.id} type="button" aria-pressed={pose === p.id} onClick={() => setPose(p.id)}>
            {p.label}
          </button>
        ))}
      </div>
      {view.editable ? <p className={styles.modelHint}>Drag the door along its wall</p> : null}
    </div>
  );
}
