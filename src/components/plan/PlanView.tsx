'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { findDoor } from '@/domain/model/lookup';
import { activeView, hingeMapOf, useWorkspace } from '@/state/store';
import { dragHingeOffset, clampHinge, nudgeStep, offsetAlongWall } from '@/render/interaction';
import { buildPlanModel, cropForRooms, fitCropToAspect, type PlanDoor } from '@/render/planModel';
import { svgToPlan } from '@/render/transforms';
import { PlanDrawing } from './PlanDrawing';
import styles from './plan.module.css';

export function PlanView() {
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const preview = useWorkspace((s) => s.preview);
  const selectedId = useWorkspace((s) => s.selectedId);
  const select = useWorkspace((s) => s.select);
  const previewEdit = useWorkspace((s) => s.previewEdit);
  const commitPreview = useWorkspace((s) => s.commitPreview);
  const edit = useWorkspace((s) => s.edit);
  const notify = useWorkspace((s) => s.notify);
  const view = useMemo(() => activeView({ project, activeId, preview }), [project, activeId, preview]);
  const [roomFocus, setRoomFocus] = useState<'R-512' | 'all'>('R-512');
  const svgRef = useRef<SVGSVGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ doorId: string; grabDelta: number; pointerId: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 900, height: 560 });

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const focusDoorId = useMemo(() => {
    if (selectedId && findDoor(view.scene, selectedId)) return selectedId;
    return 'D-101';
  }, [selectedId, view.scene]);

  const hingeMaps = useMemo(() => {
    const located = findDoor(view.scene, focusDoorId);
    if (!located) return new Map();
    const map = hingeMapOf(located.room, focusDoorId, view.scene);
    return map ? new Map([[focusDoorId, map]]) : new Map();
  }, [view.scene, focusDoorId]);

  const model = useMemo(
    () => buildPlanModel(view.scene, view.analysis, { selectedId, hingeMaps }),
    [view.scene, view.analysis, selectedId, hingeMaps],
  );
  const focusRoomId = findDoor(view.scene, focusDoorId)?.room.id ?? model.rooms[0]!.roomId;
  const roomKey = roomFocus === 'all' ? model.rooms.map((r) => r.roomId).join(',') : focusRoomId;
  const roomIds = useMemo(() => roomKey.split(','), [roomKey]);
  const dimRoomIds = useMemo(
    () => (roomFocus === 'all' ? [] : model.rooms.map((r) => r.roomId).filter((id) => id !== focusRoomId)),
    [roomFocus, model, focusRoomId],
  );
  const crop = useMemo(
    () => fitCropToAspect(cropForRooms(model, roomIds, { west: 820, east: 380, south: 1380, north: 520 }), size.width / size.height),
    [model, roomIds, size.width, size.height],
  );

  const pointerToPlan = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return svgToPlan({ x: point.x, y: point.y });
  }, []);

  const onHandlePointerDown = useCallback(
    (door: PlanDoor, event: PointerEvent<SVGElement>) => {
      select(door.doorId);
      if (!view.editable) {
        notify('info', view.kind === 'revision' ? 'Committed revisions are read-only. Create a scenario to propose a change.' : 'This scenario is locked. Return it to draft to edit.');
        return;
      }
      const p = pointerToPlan(event.clientX, event.clientY);
      if (!p) return;
      event.preventDefault();
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
      drag.current = { doorId: door.doorId, grabDelta: offsetAlongWall(door, p) - door.hingeOffsetMm, pointerId: event.pointerId };
      setDragging(door.doorId);
    },
    [pointerToPlan, select, view.editable, view.kind, notify],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      const door = model.rooms.flatMap((r) => r.doors).find((d) => d.doorId === active.doorId);
      const p = pointerToPlan(event.clientX, event.clientY);
      if (!door || !p) return;
      const offset = dragHingeOffset(door, p, active.grabDelta, event.altKey ? 1 : 10);
      previewEdit({ kind: 'door.hinge', doorId: door.doorId, hingeOffsetMm: offset });
    },
    [model, pointerToPlan, previewEdit],
  );

  const endDrag = useCallback(
    (cancel: boolean) => {
      if (!drag.current) return;
      drag.current = null;
      setDragging(null);
      if (cancel) previewEdit(null);
      else commitPreview();
    },
    [commitPreview, previewEdit],
  );

  const onHandleKeyDown = useCallback(
    (door: PlanDoor, event: KeyboardEvent<SVGElement>) => {
      const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (event.key === 'Escape' && drag.current) {
        endDrag(true);
        return;
      }
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      if (!view.editable) {
        notify('info', 'Create or select a draft scenario to move the door.');
        return;
      }
      const step = nudgeStep(event);
      let next = door.hingeOffsetMm;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += step;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= step;
      if (event.key === 'Home') next = door.dragRange[0];
      if (event.key === 'End') next = door.dragRange[1];
      next = clampHinge(door, next);
      if (next !== door.hingeOffsetMm) edit({ kind: 'door.hinge', doorId: door.doorId, hingeOffsetMm: next });
    },
    [edit, endDrag, notify, view.editable],
  );

  const summary = useMemo(() => {
    const door = model.rooms.flatMap((r) => r.doors).find((d) => d.doorId === focusDoorId);
    return door ? `Plan of ${roomIds.join(' and ')}. ${door.doorId} hinge at ${door.hingeOffsetMm} mm on the ${door.wallSide} wall.` : 'Plan';
  }, [model, focusDoorId, roomIds]);

  return (
    <div className={styles.planFrame}>
      <div className={styles.planToolbar}>
        <div className={styles.segmented} role="group" aria-label="Plan extent">
          <button type="button" aria-pressed={roomFocus === 'R-512'} onClick={() => setRoomFocus('R-512')}>
            {focusRoomId}
          </button>
          <button type="button" aria-pressed={roomFocus === 'all'} onClick={() => setRoomFocus('all')}>
            All rooms
          </button>
        </div>
        <p className={styles.planHint}>
          {view.editable ? (
            <>Drag the hinge handle or focus it and use ← → (Shift ×10, Alt 1 mm)</>
          ) : view.kind === 'revision' ? (
            <>Committed revision · read-only. Start a scenario to propose a change.</>
          ) : (
            <>Scenario locked for review.</>
          )}
        </p>
      </div>
      <div
        ref={canvasRef}
        className={styles.planCanvas}
        data-dragging={dragging ? 'true' : 'false'}
        onPointerMove={onPointerMove}
        onPointerUp={() => endDrag(false)}
        onPointerCancel={() => endDrag(true)}
      >
        <PlanDrawing
          svgRef={svgRef}
          model={model}
          crop={crop}
          mode="interactive"
          focusDoorId={focusDoorId}
          title="Floor plan"
          description={summary}
          onSelect={select}
          onHandlePointerDown={onHandlePointerDown}
          onHandleKeyDown={onHandleKeyDown}
          draggingDoorId={dragging}
          renderWidthPx={size.width}
          dimRoomIds={dimRoomIds}
        />
      </div>
    </div>
  );
}
