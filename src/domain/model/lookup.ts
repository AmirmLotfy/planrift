import type { Door, Furniture, PlanRectLike, Room, Scene, Wall } from './types';

export function findRoom(scene: Scene, roomId: string): Room | undefined {
  return scene.rooms.find((room) => room.id === roomId);
}

export function findWall(room: Room, wallId: string): Wall | undefined {
  return room.walls.find((wall) => wall.id === wallId);
}

export interface ElementLocation {
  room: Room;
  kind: 'door' | 'furniture';
  element: Door | Furniture;
}

export function locateElement(scene: Scene, elementId: string): ElementLocation | undefined {
  for (const room of scene.rooms) {
    const door = room.doors.find((d) => d.id === elementId);
    if (door) return { room, kind: 'door', element: door };
    const item = room.furniture.find((f) => f.id === elementId);
    if (item) return { room, kind: 'furniture', element: item };
  }
  return undefined;
}

export function findDoor(scene: Scene, doorId: string): { room: Room; door: Door } | undefined {
  for (const room of scene.rooms) {
    const door = room.doors.find((d) => d.id === doorId);
    if (door) return { room, door };
  }
  return undefined;
}

/** Axis-aligned bounds of any footprint (room-local). */
export function footprintBounds(item: Furniture): PlanRectLike {
  const fp = item.footprint;
  switch (fp.kind) {
    case 'rect':
      return { minX: fp.minX, minY: fp.minY, maxX: fp.maxX, maxY: fp.maxY };
    case 'circle':
      return { minX: fp.cx - fp.radiusMm, minY: fp.cy - fp.radiusMm, maxX: fp.cx + fp.radiusMm, maxY: fp.cy + fp.radiusMm };
    case 'polygon': {
      const xs = fp.points.map((p) => p.x);
      const ys = fp.points.map((p) => p.y);
      return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    }
  }
}
