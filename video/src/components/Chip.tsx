import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, easeOut } from '../anim';
import { C, MONO, SANS } from '../theme';

/** Chapter tag, top-left: number in mono and a short title, shown for a few seconds. */
export function ChapterTag({
  n,
  label,
  start,
  end,
}: {
  n: string;
  label: string;
  start: number;
  end: number;
}) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  if (t < start || t > end + 0.4) return null;
  const s = width / 2560;
  const pin = easeOut(clamp01((t - start) / 0.5));
  const pout = clamp01((t - end) / 0.4);
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 146 * s,
        display: 'flex',
        alignItems: 'center',
        gap: 16 * s,
        padding: `${14 * s}px ${22 * s}px`,
        borderRadius: 14 * s,
        background: 'rgba(255,255,255,0.96)',
        boxShadow: `0 0 0 ${1.5 * s}px ${C.rule2}, 0 24px 48px -26px rgba(17,19,21,0.45)`,
        opacity: pin * (1 - pout),
        transform: `translateX(-50%) translateY(${(1 - pin) * -14 * s}px)`,
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: 26 * s, fontWeight: 500, color: C.red }}>{n}</span>
      <span style={{ width: 2 * s, height: 30 * s, background: C.rule2 }} />
      <span
        style={{
          fontFamily: SANS,
          fontSize: 32 * s,
          fontWeight: 600,
          color: C.ink,
          letterSpacing: '-0.01em',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/** Large figure callout (value from the engine), placed in screen space. */
export function Figure({
  value,
  unit,
  label,
  start,
  end,
  x,
  y,
  color = C.ink,
  align = 'left',
}: {
  value: string;
  unit?: string;
  label: string;
  start: number;
  end: number;
  x: number;
  y: number;
  color?: string;
  align?: 'left' | 'right';
}) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  if (t < start || t > end + 0.4) return null;
  const s = width / 2560;
  const pin = easeOut(clamp01((t - start) / 0.55));
  const pout = clamp01((t - end) / 0.4);
  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'left' ? x * s : undefined,
        right: align === 'right' ? x * s : undefined,
        top: y * s,
        padding: `${26 * s}px ${34 * s}px ${30 * s}px`,
        borderRadius: 20 * s,
        background: 'rgba(255,255,255,0.97)',
        boxShadow: `0 0 0 ${1.5 * s}px ${C.rule2}, 0 30px 60px -30px rgba(17,19,21,0.5)`,
        opacity: pin * (1 - pout),
        transform: `translateY(${(1 - pin) * 26 * s}px) scale(${0.96 + 0.04 * pin})`,
        transformOrigin: align === 'left' ? '0 0' : '100% 0',
      }}
    >
      <div
        style={{ fontFamily: SANS, fontSize: 28 * s, fontWeight: 550, color: C.ink2, marginBottom: 6 * s }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 * s }}>
        <span
          style={{
            fontFamily: SANS,
            fontSize: 132 * s,
            fontWeight: 600,
            letterSpacing: '-0.04em',
            lineHeight: 1,
            color,
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          {value}
        </span>
        {unit ? (
          <span style={{ fontFamily: MONO, fontSize: 44 * s, fontWeight: 500, color }}>{unit}</span>
        ) : null}
      </div>
    </div>
  );
}
