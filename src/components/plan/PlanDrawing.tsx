'use client';

/**
 * Architectural plan drawing. Pure presentation of a PlanModel: every coordinate comes from
 * the render model (which comes from the canonical scene and its analysis).
 */

import { useId, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import type { PairStatus } from '@/domain/analysis/analyze';
import type { Vec } from '@/domain/geometry/frame';
import { formatDeg, formatMeasure, formatMm } from '@/domain/format';
import { palette, statusStroke, statusText } from '@/render/palette';
import type { PlanBounds, PlanDoor, PlanFurniture, PlanModel, PlanRoom } from '@/render/planModel';
import { cloudPath } from '@/render/cloud';
import { planToSvg } from '@/render/transforms';

export type PlanCrop = PlanBounds;

export interface PlanDrawingProps {
  model: PlanModel;
  /** Region of the plan to show (global plan mm). */
  crop: PlanCrop;
  mode?: 'interactive' | 'static' | 'thumbnail';
  /** Door whose hinge map and dimensions are drawn. */
  focusDoorId?: string | null;
  title?: string;
  description?: string;
  onSelect?: (id: string) => void;
  onHandlePointerDown?: (door: PlanDoor, event: PointerEvent<SVGElement>) => void;
  onHandleKeyDown?: (door: PlanDoor, event: KeyboardEvent<SVGElement>) => void;
  draggingDoorId?: string | null;
  svgRef?: React.Ref<SVGSVGElement>;
  className?: string;
  /** Rendered width in CSS px; label sizes are derived from it so text stays legible. */
  renderWidthPx?: number;
  /** Rooms drawn as context only (walls, no contents). */
  dimRoomIds?: readonly string[];
  /** Draw the hinge map and dimension strings for the focus door (default true). */
  showDimensions?: boolean;
}

const s = (p: Vec) => planToSvg(p);
const pts = (points: readonly Vec[]) => points.map((p) => `${round(s(p).x)},${round(s(p).y)}`).join(' ');
const round = (v: number) => Math.round(v * 10) / 10;
const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export { cropForRooms } from '@/render/planModel';

function Dimension({
  from,
  to,
  offset,
  label,
  unit,
  color = palette.mineralInk,
  textColor = palette.ink,
}: {
  from: Vec;
  to: Vec;
  /** Perpendicular offset vector (plan mm) from the measured points to the dimension line. */
  offset: Vec;
  label: string;
  unit: number;
  color?: string;
  textColor?: string;
}) {
  const a = { x: from.x + offset.x, y: from.y + offset.y };
  const b = { x: to.x + offset.x, y: to.y + offset.y };
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  if (len < 1) return null;
  const dir = { x: (b.x - a.x) / len, y: (b.y - a.y) / len };
  const tick = 70;
  const slash = (p: Vec) => {
    const d = { x: (dir.x - dir.y) * tick * 0.7, y: (dir.y + dir.x) * tick * 0.7 };
    return (
      <line
        x1={s({ x: p.x - d.x, y: p.y - d.y }).x}
        y1={s({ x: p.x - d.x, y: p.y - d.y }).y}
        x2={s({ x: p.x + d.x, y: p.y + d.y }).x}
        y2={s({ x: p.x + d.x, y: p.y + d.y }).y}
        stroke={color}
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
    );
  };
  const m = s(mid(a, b));
  const angle = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
  const upright = angle > 90 || angle < -90 ? angle + 180 : angle;
  return (
    <g aria-hidden="true">
      <line x1={s(from).x} y1={s(from).y} x2={s(a).x} y2={s(a).y} stroke={color} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      <line x1={s(to).x} y1={s(to).y} x2={s(b).x} y2={s(b).y} stroke={color} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      <line x1={s(a).x} y1={s(a).y} x2={s(b).x} y2={s(b).y} stroke={color} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
      {slash(a)}
      {slash(b)}
      <text
        x={m.x}
        y={m.y}
        dy={-4 * unit}
        transform={`rotate(${-upright} ${m.x} ${m.y})`}
        textAnchor="middle"
        fontSize={11 * unit}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fill={textColor}
        paintOrder="stroke"
        stroke={palette.paper}
        strokeWidth={3 * unit}
      >
        {label}
      </text>
    </g>
  );
}

function furnitureStyle(f: PlanFurniture): { stroke: string; width: number; dash?: string; fill: string } {
  if (f.selected) return { stroke: palette.blueprint, width: 2, fill: '#e9e5db' };
  switch (f.status) {
    case 'CONFLICT':
      return { stroke: palette.coral, width: 1.8, fill: '#efe2dc' };
    case 'CONTACT_REVIEW':
    case 'NEAR_CLEARANCE':
      return { stroke: palette.copper, width: 1.5, dash: '6 4', fill: '#ece5da' };
    case 'INVALID':
      return { stroke: palette.coralInk, width: 1.5, dash: '3 3', fill: '#f3e1dd' };
    case 'UNSUPPORTED':
      return { stroke: palette.mineral, width: 1.2, dash: '2 3', fill: '#ebe9e4' };
    default:
      return { stroke: palette.inkSoft, width: 1, fill: '#e7e3d9' };
  }
}

function RoomLayer({ room, unit, ids, mode, onSelect }: { room: PlanRoom; unit: number; ids: Ids; mode: string; onSelect?: (id: string) => void }) {
  const tl = room.interior[3]!;
  const northWall = Math.max(...room.walls.flatMap((w) => w.polygon.map((p) => p.y)));
  return (
    <g data-room={room.roomId}>
      <polygon points={pts(room.interior)} fill={palette.paper} />
      {mode !== 'thumbnail' ? <polygon points={pts(room.interior)} fill={`url(#${ids.grid})`} /> : null}
      {mode !== 'thumbnail' ? (
        // Room tag sits outside, above the north wall, so it never collides with furniture.
        <text
          x={s(tl).x}
          y={s({ x: tl.x, y: northWall }).y}
          dy={-8 * unit}
          fontSize={11 * unit}
          fontFamily="var(--font-mono), ui-monospace, monospace"
          fill={palette.mineralInk}
          letterSpacing={0.6 * unit}
        >
          {room.roomId} · {room.name.toUpperCase()}
        </text>
      ) : null}
      {room.furniture.map((f) => {
        const st = furnitureStyle(f);
        const big = f.widthMm >= 900 && f.depthMm >= 600;
        const label = (
          <>
            <polygon
              points={pts(f.polygon)}
              fill={st.fill}
              stroke={st.stroke}
              strokeWidth={st.width}
              strokeDasharray={st.dash}
              vectorEffect="non-scaling-stroke"
            />
            {f.status === 'CONFLICT' ? <polygon points={pts(f.polygon)} fill={`url(#${ids.hatchSoft})`} /> : null}
            {mode !== 'thumbnail' || f.status !== 'PASS' ? (
              <text
                x={s(f.center).x}
                y={s(f.center).y}
                dy={big ? -2 * unit : 4 * unit}
                textAnchor="middle"
                fontSize={(f.widthMm < 600 ? 10 : 11) * unit}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fontWeight={600}
                fill={f.status === 'PASS' ? palette.inkSoft : statusText[f.status]}
              >
                {f.furnitureId}
              </text>
            ) : null}
            {big && mode !== 'thumbnail' ? (
              <text x={s(f.center).x} y={s(f.center).y} dy={13 * unit} textAnchor="middle" fontSize={10 * unit} fill={palette.mineralInk}>
                {f.name}
              </text>
            ) : null}
          </>
        );
        if (mode !== 'interactive' || !onSelect) return <g key={f.furnitureId}>{label}</g>;
        return (
          <g
            key={f.furnitureId}
            data-element={f.furnitureId}
            onClick={() => onSelect(f.furnitureId)}
            style={{ cursor: 'pointer' }}
          >
            <title>{`${f.furnitureId} ${f.name} — ${STATUS_LABEL[f.status]}`}</title>
            {label}
          </g>
        );
      })}
    </g>
  );
}

interface Ids {
  grid: string;
  hatch: string;
  hatchSoft: string;
  cross: string;
}

function DoorLayer({
  door,
  unit,
  ids,
  mode,
  focus,
  dragging,
  onSelect,
  onHandlePointerDown,
  onHandleKeyDown,
  furniture,
}: {
  door: PlanDoor;
  unit: number;
  ids: Ids;
  mode: string;
  focus: boolean;
  dragging: boolean;
  onSelect?: (id: string) => void;
  onHandlePointerDown?: PlanDrawingProps['onHandlePointerDown'];
  onHandleKeyDown?: PlanDrawingProps['onHandleKeyDown'];
  furniture: readonly PlanFurniture[];
}) {
  const invalid = door.validity === 'INVALID';
  const highlight = door.selected || focus;
  const arcColor = invalid ? palette.coralInk : highlight ? palette.blueprint : palette.inkSoft;
  const interactive = mode === 'interactive';
  const hinge = s(door.hinge);
  // The strike label goes beside the struck item (away from its ID label), at the strike height.
  const struck = door.strike ? furniture.find((f) => f.furnitureId === door.strike!.furnitureId) : undefined;
  const strikeLabelAt =
    door.strike && struck
      ? {
          x: Math.max(...struck.polygon.map((p) => p.x)) + 70,
          y: Math.min(door.strike.point.y + 40, Math.max(...struck.polygon.map((p) => p.y))),
        }
      : door.strike
        ? { x: door.strike.point.x + 120, y: door.strike.point.y }
        : null;
  return (
    <g data-door={door.doorId} data-status={door.status}>
      {door.sweep ? (
        <polygon
          points={pts(door.sweep)}
          fill={invalid ? palette.coralSoft : palette.blueprint}
          fillOpacity={invalid ? 0.5 : highlight ? 0.11 : 0.06}
          stroke="none"
        />
      ) : null}
      {door.arc ? (
        <polyline
          points={pts(door.arc)}
          fill="none"
          stroke={arcColor}
          strokeWidth={highlight ? 1.3 : 0.9}
          strokeDasharray={invalid ? '6 4' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {door.footprints.map((f) => {
        const xs = f.polygon.map((p) => s(p).x);
        const ys = f.polygon.map((p) => s(p).y);
        const pad = 55;
        const cloud = {
          x: Math.min(...xs) - pad,
          y: Math.min(...ys) - pad,
          width: Math.max(...xs) - Math.min(...xs) + pad * 2,
          height: Math.max(...ys) - Math.min(...ys) + pad * 2,
        };
        return (
          <g key={f.furnitureId} data-footprint={f.furnitureId}>
            <polygon points={pts(f.polygon)} fill={`url(#${ids.hatch})`} />
            <polygon points={pts(f.polygon)} fill="none" stroke={palette.coral} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
            {mode !== 'thumbnail' ? (
              <path
                className="cloud-draw"
                d={cloudPath(cloud, Math.max(34, Math.min(cloud.width, cloud.height) / 3))}
                pathLength={1}
                fill="none"
                stroke={palette.coral}
                strokeWidth={2}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                data-cloud={f.furnitureId}
              />
            ) : null}
          </g>
        );
      })}
      {door.ghostLeaf ? (
        <polygon
          points={pts(door.ghostLeaf)}
          fill="none"
          stroke={palette.mineral}
          strokeWidth={0.9}
          strokeDasharray="5 4"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      <polygon
        points={pts(door.leaf)}
        fill={invalid ? palette.coralInk : door.status === 'CONFLICT' ? palette.coralInk : palette.ink}
        stroke={invalid ? palette.coralInk : palette.ink}
        strokeWidth={0.8}
        vectorEffect="non-scaling-stroke"
      />
      {door.intrusion && door.strike && mode !== 'thumbnail' ? (
        <g aria-hidden="true">
          <line
            x1={s(door.intrusion.from).x}
            y1={s(door.intrusion.from).y}
            x2={s(door.intrusion.to).x}
            y2={s(door.intrusion.to).y}
            stroke={palette.coralInk}
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={s(door.intrusion.to).x} cy={s(door.intrusion.to).y} r={3 * unit} fill={palette.coralInk} />
        </g>
      ) : null}
      {door.strike ? (
        <g data-strike={door.strike.furnitureId}>
          <circle cx={s(door.strike.point).x} cy={s(door.strike.point).y} r={7 * unit} fill={palette.paper} stroke={palette.coral} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <circle cx={s(door.strike.point).x} cy={s(door.strike.point).y} r={2.6 * unit} fill={palette.coral} />
          {strikeLabelAt && mode !== 'thumbnail' ? (
            <text
              x={s(strikeLabelAt).x}
              y={s(strikeLabelAt).y}
              dominantBaseline="middle"
              fontSize={11.5 * unit}
              fontFamily="var(--font-mono), ui-monospace, monospace"
              fontWeight={600}
              fill={palette.coralInk}
              paintOrder="stroke"
              stroke={palette.paper}
              strokeWidth={3 * unit}
            >
              strike {formatDeg(door.strike.deg)}
            </text>
          ) : null}
        </g>
      ) : null}
      {door.clearance && mode !== 'thumbnail' && (door.selected || focus) ? (
        <g aria-hidden="true">
          <line
            x1={s(door.clearance.from).x}
            y1={s(door.clearance.from).y}
            x2={s(door.clearance.to).x}
            y2={s(door.clearance.to).y}
            stroke={statusStroke[door.clearance.status]}
            strokeWidth={1.2}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={s(door.clearance.from).x} cy={s(door.clearance.from).y} r={2.4 * unit} fill={statusStroke[door.clearance.status]} />
          <circle cx={s(door.clearance.to).x} cy={s(door.clearance.to).y} r={2.4 * unit} fill={statusStroke[door.clearance.status]} />
          <text
            x={s(mid(door.clearance.from, door.clearance.to)).x}
            y={s(mid(door.clearance.from, door.clearance.to)).y}
            dy={-6 * unit}
            textAnchor="middle"
            fontSize={11 * unit}
            fontFamily="var(--font-mono), ui-monospace, monospace"
            fontWeight={600}
            fill={statusText[door.clearance.status]}
            paintOrder="stroke"
            stroke={palette.paper}
            strokeWidth={3 * unit}
          >
            {formatMeasure(door.clearance.valueMm)}
          </text>
        </g>
      ) : null}
      {mode !== 'thumbnail' ? (
        <text
          x={s(door.tagAt).x}
          y={s(door.tagAt).y}
          textAnchor="middle"
          fontSize={11 * unit}
          fontWeight={700}
          fontFamily="var(--font-mono), ui-monospace, monospace"
          fill={highlight ? palette.blueprint : palette.inkSoft}
          paintOrder="stroke"
          stroke={palette.paper}
          strokeWidth={3 * unit}
        >
          {door.doorId}
        </text>
      ) : null}
      {interactive && onHandlePointerDown ? (
        <g
          role="slider"
          tabIndex={0}
          aria-label={`${door.doorId} hinge position on the ${door.wallSide} wall`}
          aria-valuemin={door.dragRange[0]}
          aria-valuemax={door.dragRange[1]}
          aria-valuenow={door.hingeOffsetMm}
          aria-valuetext={`${formatMm(door.hingeOffsetMm)} from the ${door.wallSide === 'south' ? 'west' : 'start'} end of the ${door.wallSide} wall, ${STATUS_LABEL[door.status]}`}
          aria-orientation="horizontal"
          data-handle={door.doorId}
          className="plan-handle"
          style={{ cursor: dragging ? 'grabbing' : 'grab', outline: 'none' }}
          onPointerDown={(e) => onHandlePointerDown(door, e)}
          onKeyDown={(e) => onHandleKeyDown?.(door, e)}
          onFocus={() => onSelect?.(door.doorId)}
          onClick={() => onSelect?.(door.doorId)}
        >
          <polygon points={pts(door.leaf)} fill="transparent" stroke="transparent" strokeWidth={14} vectorEffect="non-scaling-stroke" />
          <circle className="plan-handle-ring" cx={hinge.x} cy={hinge.y} r={13 * unit} fill="none" stroke={palette.blueprint} strokeWidth={0} vectorEffect="non-scaling-stroke" />
          <circle cx={hinge.x} cy={hinge.y} r={7.5 * unit} fill={palette.paper} stroke={palette.blueprint} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          <circle cx={hinge.x} cy={hinge.y} r={2.5 * unit} fill={palette.blueprint} />
        </g>
      ) : null}
    </g>
  );
}

function HingeMapStrip({ door, unit }: { door: PlanDoor; unit: number }) {
  if (door.hingeBands.length === 0) return null;
  const off = (p: Vec, k: number) => ({ x: p.x + door.outward.x * k, y: p.y + door.outward.y * k });
  const current = off(
    { x: door.wallStart.x + door.tangent.x * door.hingeOffsetMm, y: door.wallStart.y + door.tangent.y * door.hingeOffsetMm },
    door.wallThicknessMm + 160,
  );
  const labelFor = (status: PairStatus, ids: readonly string[]) =>
    status === 'PASS' ? 'clear' : status === 'INVALID' ? 'leaf off wall' : `${STATUS_LABEL[status].toLowerCase()}${ids.length ? ` ${ids.join(', ')}` : ''}`;
  return (
    <g data-hinge-map={door.doorId}>
      <text
        x={s(off(door.wallStart, door.wallThicknessMm + 160)).x - 40}
        y={s(off(door.wallStart, door.wallThicknessMm + 160)).y}
        dy={4 * unit}
        textAnchor="end"
        fontSize={10 * unit}
        fontFamily="var(--font-mono), ui-monospace, monospace"
        fill={palette.mineralInk}
      >
        HINGE MAP
      </text>
      {door.hingeBands.map((band) => {
        const a = s(band.from);
        const b = s(band.to);
        const length = band.toMm - band.fromMm + 1;
        const conflict = band.status === 'CONFLICT' || band.status === 'INVALID';
        return (
          <g key={`${band.fromMm}-${band.status}`}>
            <title>{`${formatMm(band.fromMm)}–${formatMm(band.toMm)}: ${STATUS_LABEL[band.status]}${band.limitingIds.length ? ` (${band.limitingIds.join(', ')})` : ''}`}</title>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={statusStroke[band.status]}
              strokeWidth={conflict ? 9 : 7}
              strokeDasharray={band.status === 'NEAR_CLEARANCE' ? '5 3' : band.status === 'INVALID' ? '2 3' : undefined}
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
            {length / unit > labelFor(band.status, band.limitingIds).length * 6.2 + 10 ? (
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2}
                dy={22 * unit}
                textAnchor="middle"
                fontSize={9.5 * unit}
                fontFamily="var(--font-mono), ui-monospace, monospace"
                fill={statusText[band.status]}
              >
                {labelFor(band.status, band.limitingIds)}
              </text>
            ) : null}
          </g>
        );
      })}
      <g aria-hidden="true">
        <path
          d={`M${s(current).x} ${s(current).y - 9 * unit} l${-6 * unit} ${-9 * unit} h${12 * unit} z`}
          fill={palette.blueprint}
        />
      </g>
    </g>
  );
}

export function PlanDrawing({
  model,
  crop,
  mode = 'static',
  focusDoorId,
  title,
  description,
  onSelect,
  onHandlePointerDown,
  onHandleKeyDown,
  draggingDoorId,
  svgRef,
  className,
  renderWidthPx = 900,
  dimRoomIds = [],
  showDimensions = true,
}: PlanDrawingProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids: Ids = { grid: `g${uid}`, hatch: `h${uid}`, hatchSoft: `hs${uid}`, cross: `c${uid}` };
  const width = crop.maxX - crop.minX;
  const height = crop.maxY - crop.minY;
  // Millimetres per CSS pixel at the rendered size: 11 * unit renders as 11 px text.
  const unit = width / Math.max(240, renderWidthPx);
  const viewBox = `${round(crop.minX)} ${round(-crop.maxY)} ${round(width)} ${round(height)}`;
  const focusDoor = model.rooms.flatMap((r) => r.doors).find((d) => d.doorId === focusDoorId) ?? null;
  const titleId = `t${uid}`;
  const descId = `d${uid}`;
  const children: ReactNode[] = [];

  for (const room of model.rooms) {
    const dim = dimRoomIds.includes(room.roomId);
    const layers: ReactNode[] = [<RoomLayer key="room" room={room} unit={unit} ids={ids} mode={mode} onSelect={dim ? undefined : onSelect} />];
    for (const door of room.doors) {
      layers.push(
        <DoorLayer
          key={`door-${door.doorId}`}
          door={door}
          unit={unit}
          ids={ids}
          mode={dim ? 'static' : mode}
          focus={door.doorId === focusDoorId}
          dragging={draggingDoorId === door.doorId}
          onSelect={onSelect}
          onHandlePointerDown={dim ? undefined : onHandlePointerDown}
          onHandleKeyDown={onHandleKeyDown}
          furniture={room.furniture}
        />,
      );
    }
    if (dim) continue; // context rooms keep their walls (drawn below) but no contents
    children.push(<g key={`layer-${room.roomId}`}>{layers}</g>);
  }
  for (const room of model.rooms) {
    for (const piece of room.walls) {
      children.push(<polygon key={`wall-${piece.key}`} points={pts(piece.polygon)} fill={palette.ink} />);
    }
  }

  return (
    <svg
      ref={svgRef}
      className={className}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      role={mode === 'interactive' ? 'group' : 'img'}
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descId : undefined}
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', width: '100%', height: '100%', touchAction: mode === 'interactive' ? 'none' : undefined }}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {description ? <desc id={descId}>{description}</desc> : null}
      <defs>
        <pattern id={ids.grid} width={500} height={500} patternUnits="userSpaceOnUse">
          <path d="M500 0H0V500" fill="none" stroke={palette.grid} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
        </pattern>
        <pattern id={ids.hatch} width={70} height={70} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={70} height={70} fill={palette.coral} fillOpacity={0.18} />
          <line x1={0} y1={0} x2={0} y2={70} stroke={palette.coral} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
        </pattern>
        <pattern id={ids.hatchSoft} width={90} height={90} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={90} stroke={palette.coral} strokeOpacity={0.35} strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        </pattern>
      </defs>
      <clipPath id={`clip${uid}`}>
        <rect x={crop.minX} y={-crop.maxY} width={width} height={height} />
      </clipPath>
      <rect x={crop.minX} y={-crop.maxY} width={width} height={height} fill={palette.canvas} />
      <g clipPath={`url(#clip${uid})`}>{children}</g>
      {focusDoor && mode !== 'thumbnail' && showDimensions ? (
        <>
          <HingeMapStrip door={focusDoor} unit={unit} />
          <Dimension
            from={focusDoor.wallStart}
            to={{ x: focusDoor.wallStart.x + focusDoor.tangent.x * focusDoor.hingeOffsetMm, y: focusDoor.wallStart.y + focusDoor.tangent.y * focusDoor.hingeOffsetMm }}
            offset={{ x: focusDoor.outward.x * (focusDoor.wallThicknessMm + 160 + 44 * unit), y: focusDoor.outward.y * (focusDoor.wallThicknessMm + 160 + 44 * unit) }}
            label={`hinge ${formatMm(focusDoor.hingeOffsetMm)}`}
            unit={unit}
            color={palette.blueprint}
            textColor={palette.blueprint}
          />
          {(() => {
            const room = model.rooms.find((r) => r.roomId === focusDoor.roomId)!;
            const sw = room.interior[0]!;
            const se = room.interior[1]!;
            const nw = room.interior[3]!;
            return (
              <>
                <Dimension from={sw} to={se} offset={{ x: 0, y: -(focusDoor.wallThicknessMm + 160 + 72 * unit) }} label={formatMm(room.widthMm)} unit={unit} />
                <Dimension from={sw} to={nw} offset={{ x: -480, y: 0 }} label={formatMm(room.depthMm)} unit={unit} />
              </>
            );
          })()}
        </>
      ) : null}
    </svg>
  );
}
