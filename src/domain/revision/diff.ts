/**
 * Structural diff between two canonical scenes, keyed by element ID and field name.
 * The diff is what drives the document impact ledger, the timeline and the receipt.
 */

import { formatMm, formatSignedDelta } from '../format';
import type { Door, Furniture, Room, Scene } from '../model/types';

export type ElementKind = 'room' | 'door' | 'furniture';

export interface FieldChange {
  readonly roomId: string;
  readonly elementId: string;
  readonly elementKind: ElementKind;
  /** Dotted field path, e.g. "hingeOffsetMm" or "footprint.minX". */
  readonly field: string;
  readonly before: unknown;
  readonly after: unknown;
}

export interface ElementPresenceChange {
  readonly roomId: string;
  readonly elementId: string;
  readonly elementKind: ElementKind;
  readonly change: 'added' | 'removed';
}

export interface SceneDiff {
  readonly fields: readonly FieldChange[];
  readonly presence: readonly ElementPresenceChange[];
  readonly settingsChanged: boolean;
}

function flatten(value: unknown, prefix: string, out: Map<string, unknown>): void {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return;
  }
  out.set(prefix, Array.isArray(value) ? JSON.stringify(value) : value);
}

function diffObjects(
  roomId: string,
  elementId: string,
  elementKind: ElementKind,
  before: object,
  after: object,
  skip: ReadonlySet<string>,
): FieldChange[] {
  const a = new Map<string, unknown>();
  const b = new Map<string, unknown>();
  flatten(before, '', a);
  flatten(after, '', b);
  const keys = [...new Set([...a.keys(), ...b.keys()])].sort();
  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (skip.has(key.split('.')[0]!)) continue;
    if (!Object.is(a.get(key), b.get(key))) {
      changes.push({ roomId, elementId, elementKind, field: key, before: a.get(key), after: b.get(key) });
    }
  }
  return changes;
}

const ROOM_SKIP = new Set(['doors', 'furniture', 'id']);
const ELEMENT_SKIP = new Set(['id']);

function diffCollection<T extends Door | Furniture>(
  roomId: string,
  kind: ElementKind,
  before: readonly T[],
  after: readonly T[],
  fields: FieldChange[],
  presence: ElementPresenceChange[],
): void {
  const afterById = new Map(after.map((e) => [e.id, e]));
  const beforeIds = new Set(before.map((e) => e.id));
  for (const element of before) {
    const next = afterById.get(element.id);
    if (!next) presence.push({ roomId, elementId: element.id, elementKind: kind, change: 'removed' });
    else fields.push(...diffObjects(roomId, element.id, kind, element, next, ELEMENT_SKIP));
  }
  for (const element of after) {
    if (!beforeIds.has(element.id)) presence.push({ roomId, elementId: element.id, elementKind: kind, change: 'added' });
  }
}

export function diffScenes(before: Scene, after: Scene): SceneDiff {
  const fields: FieldChange[] = [];
  const presence: ElementPresenceChange[] = [];
  const afterRooms = new Map(after.rooms.map((r) => [r.id, r]));
  const beforeRoomIds = new Set(before.rooms.map((r) => r.id));
  for (const room of before.rooms) {
    const next = afterRooms.get(room.id);
    if (!next) {
      presence.push({ roomId: room.id, elementId: room.id, elementKind: 'room', change: 'removed' });
      continue;
    }
    fields.push(...diffObjects(room.id, room.id, 'room', room, next, ROOM_SKIP));
    diffCollection<Door>(room.id, 'door', room.doors, next.doors, fields, presence);
    diffCollection<Furniture>(room.id, 'furniture', room.furniture, next.furniture, fields, presence);
  }
  for (const room of after.rooms as Room[]) {
    if (!beforeRoomIds.has(room.id)) presence.push({ roomId: room.id, elementId: room.id, elementKind: 'room', change: 'added' });
  }
  const settingsChanged =
    before.settings.contactToleranceMm !== after.settings.contactToleranceMm ||
    before.settings.nearClearanceMm !== after.settings.nearClearanceMm;
  return { fields, presence, settingsChanged };
}

export function isEmptyDiff(diff: SceneDiff): boolean {
  return diff.fields.length === 0 && diff.presence.length === 0 && !diff.settingsChanged;
}

const FIELD_LABEL: Record<string, string> = {
  hingeOffsetMm: 'hinge position',
  leafWidthMm: 'leaf width',
  leafThicknessMm: 'leaf thickness',
  heightMm: 'height',
  leafDirection: 'handing',
  swingDeg: 'swing angle',
  swingSide: 'swing side',
  operation: 'operation',
  wallId: 'host wall',
  name: 'name',
};

export function describeFieldChange(change: FieldChange): string {
  const label = FIELD_LABEL[change.field] ?? change.field;
  const { before, after } = change;
  if (typeof before === 'number' && typeof after === 'number' && change.field.endsWith('Mm')) {
    return `${change.elementId} ${label} ${formatMm(before)} → ${formatMm(after)} (${formatSignedDelta(after - before)})`;
  }
  if (change.field === 'swingDeg') return `${change.elementId} ${label} ${String(before)}° → ${String(after)}°`;
  return `${change.elementId} ${label} ${String(before)} → ${String(after)}`;
}

/** Changed element IDs in first-seen order. */
export function changedElementIds(diff: SceneDiff): string[] {
  const ids: string[] = [];
  for (const c of [...diff.fields, ...diff.presence]) if (!ids.includes(c.elementId)) ids.push(c.elementId);
  return ids;
}
