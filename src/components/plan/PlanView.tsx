'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { findDoor } from '@/domain/model/lookup';
import { activeView, hingeMapOf, useWorkspace } from '@/state/store';
import { dragHingeOffset, clampHinge, nudgeStep, offsetAlongWall } from '@/render/interaction';
import { buildPlanModel, cropForRooms, fitCropToAspect, type PlanBounds, type PlanDoor } from '@/render/planModel';
import { svgToPlan } from '@/render/transforms';
import { PlanDrawing } from './PlanDrawing';
import styles from './plan.module.css';

/** Pixels kept free of drawing content at each edge, for overlays that float above the plan. */
export interface PlanInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

const NO_INSETS: PlanInsets = { top: 0, right: 0, bottom: 0, left: 0 };
/** Room for the 4,500 mm dimension (west), the hinge map and dimension strings (south). */
const ROOM_PADDING = { west: 820, east: 380, south: 1380, north: 420 };
const SCALE_STEPS_MM = [250, 500, 1000, 2000, 5000, 10000];

/**
 * Fits the padded room crop inside the canvas minus the overlay insets, then grows it back to
 * the full canvas so the SVG fills the frame while drawing content stays clear of overlays.
 */
function cropWithInsets(base: PlanBounds, size: { width: number; height: number }, insets: PlanInsets): PlanBounds {
  const innerW = Math.max(80, size.width - insets.left - insets.right);
  const innerH = Math.max(80, size.height - insets.top - insets.bottom);
  const fitted = fitCropToAspect(base, innerW / innerH);
  const mmPerPx = (fitted.maxX - fitted.minX) / innerW;
  return {
    minX: fitted.minX - insets.left * mmPerPx,
    maxX: fitted.maxX + insets.right * mmPerPx,
    minY: fitted.minY - insets.bottom * mmPerPx,
    maxY: fitted.maxY + insets.top * mmPerPx,
  };
}

function ScaleBar({ pxPerMm }: { pxPerMm: number }) {
  const lengthMm = SCALE_STEPS_MM.find((mm) => mm * pxPerMm >= 56) ?? SCALE_STEPS_MM[SCALE_STEPS_MM.length - 1]!;
  const width = Math.round(lengthMm * pxPerMm);
  const label = lengthMm >= 1000 ? `${lengthMm / 1000} m` : `${lengthMm} mm`;
  return (
    <div className={styles.scale} aria-label={`Scale bar: ${label}`} role="img">
      <span className={styles.scaleBar} style={{ width }} aria-hidden="true">
        <span />
        <span />
      </span>
      <span className={styles.scaleLabel}>{label}</span>
    </div>
  );
}

export function PlanView({
  extent = 'room',
  insets = NO_INSETS,
  footer,
  showScale = true,
}: {
  /** Show the focus door's room only, or every room in the scene. */
  extent?: 'room' | 'all';
  insets?: PlanInsets;
  /** Rendered at the bottom-left beside the scale bar (e.g. the status legend). */
  footer?: ReactNode;
  showScale?: boolean;
}) {
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
  const roomKey = extent === 'all' ? model.rooms.map((r) => r.roomId).join(',') : focusRoomId;
  const roomIds = useMemo(() => roomKey.split(','), [roomKey]);
  const dimRoomIds = useMemo(
    () => (extent === 'all' ? [] : model.rooms.map((r) => r.roomId).filter((id) => id !== focusRoomId)),
    [extent, model, focusRoomId],
  );
  const { top, right, bottom, left } = insets;
  const crop = useMemo(
    () => cropWithInsets(cropForRooms(model, roomIds, ROOM_PADDING), size, { top, right, bottom, left }),
    [model, roomIds, size, top, right, bottom, left],
  );
  const pxPerMm = size.width / Math.max(1, crop.maxX - crop.minX);

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
    <div className={styles.planFrame} data-editable={view.editable ? 'true' : 'false'}>
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
      {showScale || footer ? (
        <div className={styles.planFooter}>
          {showScale ? <ScaleBar pxPerMm={pxPerMm} /> : null}
          {footer}
        </div>
      ) : null}
    </div>
  );
}
