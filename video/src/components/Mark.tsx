import { clamp01, easeOut } from '../anim';
import { C } from '../theme';

/**
 * The PLANRIFT mark (src/components/brand/Logo.tsx): a plan door symbol with a redline block in its
 * swing. `draw` 0..1 inks the outline, leaf and arc; `drop` 0..1 brings the block in.
 */
export function Mark({ size, draw, drop }: { size: number; draw: number; drop: number }) {
  const d1 = clamp01(draw / 0.55);
  const d2 = clamp01((draw - 0.4) / 0.3);
  const d3 = clamp01((draw - 0.55) / 0.45);
  const dropE = easeOut(clamp01(drop));
  const bounce = drop > 0 && drop < 1 ? Math.sin(dropE * Math.PI) * 0.6 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ overflow: 'visible' }}>
      <path
        d="M7 21.5H2.5V2.5h19v19H17"
        fill="none"
        stroke={C.ink}
        strokeWidth={2}
        strokeLinejoin="miter"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - d1}
      />
      <path
        d="M7 21.5V11.5"
        stroke={C.ink}
        strokeWidth={2.6}
        strokeLinecap="square"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - d2}
      />
      <path
        d="M17 21.5A10 10 0 0 0 7 11.5"
        fill="none"
        stroke={C.ink}
        strokeWidth={1.3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - d3}
      />
      {drop > 0 ? (
        <rect
          x={12.6}
          y={12.9 - (1 - dropE) * 14 - bounce}
          width={5.4}
          height={4.2}
          fill={C.red}
          opacity={clamp01(drop * 3)}
        />
      ) : null}
    </svg>
  );
}
