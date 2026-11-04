/** Presentation formatting for canonical integer-millimetre values. */

const grouped = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat('en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Whole millimetres with thousands separators, e.g. "6,000 mm". */
export function formatMm(value: number): string {
  return `${grouped.format(value)} mm`;
}

/** Measured distances, one decimal place, e.g. "188.7 mm". */
export function formatMeasure(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${oneDecimal.format(rounded === 0 ? 0 : rounded)} mm`;
}

export function formatDeg(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)}°`;
}

export function formatAreaM2(valueMm2: number): string {
  return `${(valueMm2 / 1_000_000).toFixed(3)} m²`;
}

export function formatSignedDelta(value: number): string {
  if (value === 0) return '±0 mm';
  return `${value > 0 ? '+' : '−'}${grouped.format(Math.abs(value))} mm`;
}
