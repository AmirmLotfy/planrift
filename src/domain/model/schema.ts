/**
 * Canonical scene schema. Every imported or persisted scene passes through this schema.
 * Structural validation (types, integer millimetres, bounds, size limits, unique IDs,
 * referential integrity) happens here. Semantic validity (a door leaf extending past its
 * wall, furniture outside a room) is reported by the analysis engine as INVALID so the
 * designer can see and fix it.
 */

import { z } from 'zod';

export const MAX_COORD_MM = 100_000;

export const LIMITS = {
  rooms: 20,
  doorsPerRoom: 12,
  furniturePerRoom: 60,
  documents: 100,
  links: 500,
  polygonPoints: 64,
  shortText: 80,
  mediumText: 160,
  longText: 2000,
} as const;

const mm = z.int().min(-MAX_COORD_MM).max(MAX_COORD_MM);
const positiveMm = z.int().min(1).max(MAX_COORD_MM);
export const idSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/, 'IDs use letters, digits, dot, underscore or hyphen (max 32)');
const shortText = z.string().max(LIMITS.shortText);
const mediumText = z.string().max(LIMITS.mediumText);

export const wallSideSchema = z.enum(['south', 'east', 'north', 'west']);

export const wallSchema = z.strictObject({
  id: idSchema,
  side: wallSideSchema,
  thicknessMm: z.int().min(50).max(1000),
});

export const doorOperationSchema = z.enum(['hinged-single', 'hinged-double', 'sliding', 'pocket', 'pivot']);

export const doorSchema = z.strictObject({
  id: idSchema,
  name: shortText,
  wallId: idSchema,
  hingeOffsetMm: mm,
  leafWidthMm: positiveMm,
  leafThicknessMm: z.int().min(10).max(150),
  heightMm: z.int().min(1500).max(4000),
  operation: doorOperationSchema,
  swingDeg: z.int().min(1).max(360),
  swingSide: z.enum(['interior', 'exterior']),
  leafDirection: z.enum(['toward-end', 'toward-start']),
});

const pointSchema = z.strictObject({ x: mm, y: mm });

export const rectFootprintSchema = z.strictObject({
  kind: z.literal('rect'),
  minX: mm,
  minY: mm,
  maxX: mm,
  maxY: mm,
  rotationDeg: z.int().min(0).max(359),
});

export const footprintSchema = z.discriminatedUnion('kind', [
  rectFootprintSchema,
  z.strictObject({ kind: z.literal('circle'), cx: mm, cy: mm, radiusMm: positiveMm }),
  z.strictObject({ kind: z.literal('polygon'), points: z.array(pointSchema).min(3).max(LIMITS.polygonPoints) }),
]);

export const furnitureCategorySchema = z.enum([
  'bed',
  'nightstand',
  'desk',
  'chair',
  'lounge-chair',
  'console',
  'wardrobe',
  'media-unit',
  'table',
  'other',
]);

export const furnitureSchema = z.strictObject({
  id: idSchema,
  name: shortText,
  category: furnitureCategorySchema,
  heightMm: z.int().min(1).max(4000),
  footprint: footprintSchema,
});

export const roomSchema = z.strictObject({
  id: idSchema,
  name: shortText,
  level: shortText,
  originMm: pointSchema,
  widthMm: z.int().min(500).max(MAX_COORD_MM),
  depthMm: z.int().min(500).max(MAX_COORD_MM),
  heightMm: z.int().min(2000).max(10_000),
  walls: z.array(wallSchema).length(4),
  doors: z.array(doorSchema).max(LIMITS.doorsPerRoom),
  furniture: z.array(furnitureSchema).max(LIMITS.furniturePerRoom),
});

export const documentSchema = z.strictObject({
  id: idSchema,
  title: mediumText,
  kind: z.enum(['drawing', 'schedule', 'specification']),
  revision: z.string().max(8),
  issuedOn: z.iso.date(),
  status: shortText,
});

export const linkSchema = z.strictObject({
  id: idSchema,
  elementId: idSchema,
  documentId: idSchema,
  /** Field names on the element that trigger review, or ['*'] for any change. */
  fields: z.array(z.string().regex(/^(\*|[a-zA-Z][a-zA-Z0-9]{0,39})$/)).min(1).max(20),
  note: mediumText,
});

export const settingsSchema = z
  .strictObject({
    contactToleranceMm: z.int().min(0).max(50),
    nearClearanceMm: z.int().min(1).max(2000),
  })
  .refine((s) => s.nearClearanceMm > s.contactToleranceMm, {
    message: 'nearClearanceMm must be greater than contactToleranceMm',
    path: ['nearClearanceMm'],
  });

export const projectInfoSchema = z.strictObject({
  id: idSchema,
  name: mediumText,
  client: mediumText,
  location: mediumText,
  phase: mediumText,
});

const sceneShape = z.strictObject({
  format: z.literal('planrift.scene'),
  version: z.literal(1),
  project: projectInfoSchema,
  settings: settingsSchema,
  rooms: z.array(roomSchema).min(1).max(LIMITS.rooms),
  documents: z.array(documentSchema).max(LIMITS.documents),
  links: z.array(linkSchema).max(LIMITS.links),
});

export const sceneSchema = sceneShape.superRefine((scene, ctx) => {
  const seen = new Map<string, string>();
  const claim = (id: string, path: (string | number)[]) => {
    const previous = seen.get(id);
    if (previous) {
      ctx.addIssue({ code: 'custom', message: `Duplicate ID "${id}" (also used at ${previous})`, path });
    } else {
      seen.set(id, path.join('.'));
    }
  };
  const elementIds = new Set<string>();

  scene.rooms.forEach((room, r) => {
    claim(room.id, ['rooms', r, 'id']);
    const sides = new Set(room.walls.map((w) => w.side));
    if (sides.size !== 4) {
      ctx.addIssue({ code: 'custom', message: `Room ${room.id} needs exactly one wall per side`, path: ['rooms', r, 'walls'] });
    }
    const wallIds = new Set<string>();
    room.walls.forEach((wall, w) => {
      claim(wall.id, ['rooms', r, 'walls', w, 'id']);
      wallIds.add(wall.id);
    });
    room.doors.forEach((door, d) => {
      claim(door.id, ['rooms', r, 'doors', d, 'id']);
      elementIds.add(door.id);
      if (!wallIds.has(door.wallId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Door ${door.id} references wall "${door.wallId}", which is not in room ${room.id}`,
          path: ['rooms', r, 'doors', d, 'wallId'],
        });
      }
    });
    room.furniture.forEach((item, f) => {
      claim(item.id, ['rooms', r, 'furniture', f, 'id']);
      elementIds.add(item.id);
      const fp = item.footprint;
      if (fp.kind === 'rect' && (fp.maxX <= fp.minX || fp.maxY <= fp.minY)) {
        ctx.addIssue({
          code: 'custom',
          message: `Furniture ${item.id} has a degenerate footprint (zero or negative width or depth)`,
          path: ['rooms', r, 'furniture', f, 'footprint'],
        });
      }
    });
    elementIds.add(room.id);
  });

  const documentIds = new Set<string>();
  scene.documents.forEach((doc, i) => {
    claim(doc.id, ['documents', i, 'id']);
    documentIds.add(doc.id);
  });
  scene.links.forEach((link, i) => {
    claim(link.id, ['links', i, 'id']);
    if (!elementIds.has(link.elementId)) {
      ctx.addIssue({ code: 'custom', message: `Link ${link.id} references unknown element "${link.elementId}"`, path: ['links', i, 'elementId'] });
    }
    if (!documentIds.has(link.documentId)) {
      ctx.addIssue({ code: 'custom', message: `Link ${link.id} references unknown document "${link.documentId}"`, path: ['links', i, 'documentId'] });
    }
  });
});

export type Scene = z.infer<typeof sceneSchema>;
export type Room = Scene['rooms'][number];
export type Wall = Room['walls'][number];
export type Door = Room['doors'][number];
export type Furniture = Room['furniture'][number];
export type Footprint = Furniture['footprint'];
export type RectFootprint = z.infer<typeof rectFootprintSchema>;
export type DocumentRef = Scene['documents'][number];
export type DependencyLink = Scene['links'][number];
export type AnalysisSettings = Scene['settings'];
export type ProjectInfo = Scene['project'];
export type FurnitureCategory = z.infer<typeof furnitureCategorySchema>;
export type DoorOperation = z.infer<typeof doorOperationSchema>;
