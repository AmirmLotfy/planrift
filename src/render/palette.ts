import type { PairStatus } from '@/domain/analysis/analyze';

/**
 * Colour tokens, mirrored from src/app/globals.css so exported SVGs and the WebGL scene are
 * self-contained. "Ink" variants meet WCAG AA (≥ 4.5:1) for text on the canvas colour.
 */
export const palette = {
  canvas: '#F6F6F3',
  paper: '#FFFFFF',
  model: '#F8F8F4',
  model2: '#ECEBE5',
  ink: '#111315',
  inkSoft: '#4A5057',
  mineral: '#858B91',
  mineralInk: '#6A7076',
  /** Grip blue: interaction and selection only. */
  blueprint: '#2F5BFF',
  blueprintSoft: '#C8D4FF',
  stone: '#E3E4DF',
  stoneDeep: '#CFD1CB',
  copper: '#E8A600',
  copperInk: '#7A5600',
  /** Redline: conflict and change only. */
  coral: '#FF4A1C',
  coralInk: '#C6300B',
  coralSoft: '#FFEDE7',
  evergreen: '#0E9F5A',
  evergreenSoft: '#E6F6EE',
  highlighter: '#FFE14D',
  grid: '#ECECE8',
} as const;

export type StatusKey = PairStatus | 'REVIEW_REQUIRED';

export const statusStroke: Record<StatusKey, string> = {
  PASS: palette.evergreen,
  NEAR_CLEARANCE: palette.copper,
  CONTACT_REVIEW: palette.copper,
  CONFLICT: palette.coral,
  INVALID: palette.coralInk,
  UNSUPPORTED: palette.mineral,
  REVIEW_REQUIRED: palette.copper,
};

export const statusText: Record<StatusKey, string> = {
  PASS: '#0A7A45',
  NEAR_CLEARANCE: palette.copperInk,
  CONTACT_REVIEW: palette.copperInk,
  CONFLICT: palette.coralInk,
  INVALID: palette.coralInk,
  UNSUPPORTED: palette.mineralInk,
  REVIEW_REQUIRED: palette.copperInk,
};
