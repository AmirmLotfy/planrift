import capturesJson from './captures.json';
import eventsJson from './events.json';
import excerptJson from './excerpt.json';
import timelineJson from './timeline.json';

export interface CaptionWord {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
export interface CaptionPage {
  readonly start: number;
  readonly end: number;
  readonly words: readonly CaptionWord[];
}
export interface CaptionLine {
  readonly id: string;
  readonly start: number;
  readonly end: number;
  readonly pages: readonly CaptionPage[];
}
export interface Capture {
  readonly frames: number;
  /** [frame, cssX, cssY, down] */
  readonly cursor: readonly (readonly [number, number, number, number])[];
  readonly marks: readonly { readonly label: string; readonly frame: number }[];
  /** Element boxes in capture CSS px, read during the capture at the end of a hold. */
  readonly boxes: Readonly<Record<string, Box>>;
}
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A logged box from a capture; fails loudly at render time if the capture lacks it. */
export function boxOf(name: string, key: string): Box {
  const b = CAPTURES[name]?.boxes?.[key];
  if (!b) throw new Error(`capture ${name} has no box "${key}"; re-run scripts/capture.mjs ${name}`);
  return b;
}

export const TIMELINE = timelineJson;
export const EVENTS = eventsJson as unknown as {
  fps: number;
  duration: number;
  captions: CaptionLine[];
  moments: Record<string, number>;
  sfx: { t: number; name: string; gain: number }[];
};
export const M = EVENTS.moments;
export const CAPTURES = capturesJson as unknown as Record<string, Capture>;
export const EXCERPT = excerptJson as { file: string; line: number; code: string };

/** Capture CSS viewport (the app was recorded at 1440×810, 2× pixels). */
export const CSS_W = 1440;
export const CSS_H = 810;
