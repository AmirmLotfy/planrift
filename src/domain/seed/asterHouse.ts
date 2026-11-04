/**
 * Aster House Hotel — Guest Room Revision. A fictional sample project.
 *
 * R-512 is the flagship room (6000 x 4500 x 2900 mm). R-513 is its mirror image across the
 * shared party wall. In R-512 every item other than Console F-07 sits at y >= 950 mm, 100 mm
 * beyond the reach of an 850 mm leaf on the south wall, so the documented status bands for
 * D-101 (GEOMETRY_CONTRACT.md §7) hold exactly.
 */

import type { Door, Furniture, Room, Scene } from '../model/schema';

const ROOM_WIDTH = 6000;
const ROOM_DEPTH = 4500;

function rect(minX: number, minY: number, maxX: number, maxY: number): Furniture['footprint'] {
  return { kind: 'rect', minX, minY, maxX, maxY, rotationDeg: 0 };
}

interface FurnitureSpec {
  suffix: string;
  name: string;
  category: Furniture['category'];
  heightMm: number;
  box: [number, number, number, number];
}

const R512_FURNITURE: FurnitureSpec[] = [
  { suffix: '01', name: 'King bed', category: 'bed', heightMm: 620, box: [3970, 1785, 6000, 3715] },
  { suffix: '02', name: 'Nightstand south', category: 'nightstand', heightMm: 550, box: [5500, 1235, 6000, 1735] },
  { suffix: '03', name: 'Nightstand north', category: 'nightstand', heightMm: 550, box: [5500, 3765, 6000, 4265] },
  { suffix: '04', name: 'Writing desk', category: 'desk', heightMm: 750, box: [1300, 3950, 2700, 4500] },
  { suffix: '05', name: 'Desk chair', category: 'chair', heightMm: 820, box: [1750, 3350, 2250, 3850] },
  { suffix: '06', name: 'Lounge chair', category: 'lounge-chair', heightMm: 780, box: [3000, 3700, 3750, 4450] },
  { suffix: '07', name: 'Console', category: 'console', heightMm: 760, box: [3620, 230, 4100, 650] },
  { suffix: '08', name: 'Wardrobe', category: 'wardrobe', heightMm: 2100, box: [0, 1000, 600, 2400] },
  { suffix: '09', name: 'Media unit', category: 'media-unit', heightMm: 600, box: [0, 2700, 450, 3700] },
];

function walls(roomNumber: string, eastThickness: number, westThickness: number): Room['walls'] {
  return [
    { id: `W-${roomNumber}-S`, side: 'south', thicknessMm: 150 },
    { id: `W-${roomNumber}-E`, side: 'east', thicknessMm: eastThickness },
    { id: `W-${roomNumber}-N`, side: 'north', thicknessMm: 250 },
    { id: `W-${roomNumber}-W`, side: 'west', thicknessMm: westThickness },
  ];
}

function entryDoor(id: string, roomNumber: string, hingeOffsetMm: number, leafDirection: Door['leafDirection']): Door {
  return {
    id,
    name: 'Entry door',
    wallId: `W-${roomNumber}-S`,
    hingeOffsetMm,
    leafWidthMm: 850,
    leafThicknessMm: 45,
    heightMm: 2100,
    operation: 'hinged-single',
    swingDeg: 90,
    swingSide: 'interior',
    leafDirection,
  };
}

const r512: Room = {
  id: 'R-512',
  name: 'Guest Room 512',
  level: 'Level 5',
  originMm: { x: 0, y: 0 },
  widthMm: ROOM_WIDTH,
  depthMm: ROOM_DEPTH,
  heightMm: 2900,
  walls: walls('512', 150, 150),
  doors: [entryDoor('D-101', '512', 1700, 'toward-end')],
  furniture: R512_FURNITURE.map((f) => ({
    id: `F-${f.suffix}`,
    name: f.name,
    category: f.category,
    heightMm: f.heightMm,
    footprint: rect(...f.box),
  })),
};

/** R-513 mirrors R-512 across x = 3000 (local), sharing the party wall with R-512. */
const r513: Room = {
  id: 'R-513',
  name: 'Guest Room 513',
  level: 'Level 5',
  originMm: { x: ROOM_WIDTH + 150, y: 0 },
  widthMm: ROOM_WIDTH,
  depthMm: ROOM_DEPTH,
  heightMm: 2900,
  walls: walls('513', 150, 150),
  doors: [entryDoor('D-102', '513', ROOM_WIDTH - 1700, 'toward-start')],
  furniture: R512_FURNITURE.map((f) => {
    const [minX, minY, maxX, maxY] = f.box;
    return {
      id: `F-1${f.suffix.slice(1)}`,
      name: f.name,
      category: f.category,
      heightMm: f.heightMm,
      footprint: rect(ROOM_WIDTH - maxX, minY, ROOM_WIDTH - minX, maxY),
    };
  }),
};

const DOOR_ELEVATION_FIELDS = ['hingeOffsetMm', 'leafWidthMm', 'heightMm', 'leafDirection', 'wallId'];

export function createAsterHouseScene(): Scene {
  return {
    format: 'planrift.scene',
    version: 1,
    project: {
      id: 'AH-GR-2026',
      name: 'Aster House Hotel — Guest Room Revision',
      client: 'Aster House Hospitality (fictional)',
      location: 'Fictional sample project',
      phase: 'Design development · fit-out revision',
    },
    settings: { contactToleranceMm: 1, nearClearanceMm: 100 },
    rooms: [structuredClone(r512), structuredClone(r513)],
    documents: [
      { id: 'A-101', title: 'Level 5 Floor Plan — Guest Rooms 512–513', kind: 'drawing', revision: 'C', issuedOn: '2026-10-21', status: 'Issued for coordination' },
      { id: 'A-401', title: 'Interior Elevations — Room 512', kind: 'drawing', revision: 'B', issuedOn: '2026-10-14', status: 'Issued for coordination' },
      { id: 'A-402', title: 'Interior Elevations — Room 513', kind: 'drawing', revision: 'B', issuedOn: '2026-10-14', status: 'Issued for coordination' },
      { id: 'D-01', title: 'Door Schedule — Level 5', kind: 'schedule', revision: 'D', issuedOn: '2026-10-28', status: 'Issued for coordination' },
    ],
    links: [
      { id: 'L-01', elementId: 'D-101', documentId: 'A-101', fields: ['*'], note: 'Door tag, swing and position on the floor plan' },
      { id: 'L-02', elementId: 'D-101', documentId: 'A-401', fields: DOOR_ELEVATION_FIELDS, note: 'South wall elevation: opening position and size' },
      { id: 'L-03', elementId: 'D-101', documentId: 'D-01', fields: ['*'], note: 'Schedule row D-101: size, type, handing, location' },
      { id: 'L-04', elementId: 'D-102', documentId: 'A-101', fields: ['*'], note: 'Door tag, swing and position on the floor plan' },
      { id: 'L-05', elementId: 'D-102', documentId: 'A-402', fields: DOOR_ELEVATION_FIELDS, note: 'South wall elevation: opening position and size' },
      { id: 'L-06', elementId: 'D-102', documentId: 'D-01', fields: ['*'], note: 'Schedule row D-102: size, type, handing, location' },
      { id: 'L-07', elementId: 'F-07', documentId: 'A-101', fields: ['*'], note: 'Furniture layout on the floor plan' },
      { id: 'L-08', elementId: 'F-07', documentId: 'A-401', fields: ['*'], note: 'Console shown on the south wall elevation' },
      { id: 'L-09', elementId: 'F-17', documentId: 'A-101', fields: ['*'], note: 'Furniture layout on the floor plan' },
      { id: 'L-10', elementId: 'F-17', documentId: 'A-402', fields: ['*'], note: 'Console shown on the south wall elevation' },
    ],
  };
}

export const FLAGSHIP = {
  roomId: 'R-512',
  doorId: 'D-101',
  consoleId: 'F-07',
  otherRoomId: 'R-513',
  baselineHingeMm: 1700,
  revisionAHingeMm: 3000,
  revisionBHingeMm: 2400,
  invalidHingeMm: 5400,
} as const;
