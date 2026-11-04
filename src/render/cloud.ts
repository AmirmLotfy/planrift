/**
 * Revision cloud: the scalloped outline architects draw around changed areas on a drawing.
 * Pure path generator in SVG user units. The path walks the rectangle clockwise (screen
 * coordinates, y down) and every scallop bulges outward.
 */

export interface CloudRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function edgeCount(length: number, targetScallop: number): number {
  return Math.max(2, Math.round(length / targetScallop));
}

export function cloudPath(rect: CloudRect, scallop: number): string {
  const { x, y, width, height } = rect;
  const nx = edgeCount(width, scallop);
  const ny = edgeCount(height, scallop);
  const sx = width / nx;
  const sy = height / ny;
  // Radius slightly above half the chord so each scallop is a clear bump, not a flat segment.
  const rx = (sx / 2) * 1.08;
  const ry = (sy / 2) * 1.08;
  const f = (v: number) => Math.round(v * 100) / 100;
  const parts = [`M${f(x)} ${f(y)}`];
  for (let i = 1; i <= nx; i += 1) parts.push(`A${f(rx)} ${f(rx)} 0 0 1 ${f(x + i * sx)} ${f(y)}`);
  for (let i = 1; i <= ny; i += 1) parts.push(`A${f(ry)} ${f(ry)} 0 0 1 ${f(x + width)} ${f(y + i * sy)}`);
  for (let i = 1; i <= nx; i += 1) parts.push(`A${f(rx)} ${f(rx)} 0 0 1 ${f(x + width - i * sx)} ${f(y + height)}`);
  for (let i = 1; i <= ny; i += 1) parts.push(`A${f(ry)} ${f(ry)} 0 0 1 ${f(x)} ${f(y + height - i * sy)}`);
  return `${parts.join(' ')} Z`;
}
