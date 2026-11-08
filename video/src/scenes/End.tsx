import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, easeOut, prog } from '../anim';
import { Mark } from '../components/Mark';
import { EVENTS, M } from '../data';
import { C, MONO, SANS } from '../theme';

/** End card: mark, name, the closing line as it is spoken, then where to try it. */
export function End({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = start + frame / fps;
  const s = width / 2560;
  const words = EVENTS.captions
    .find((c) => c.id === 'VO-18')!
    .pages.flatMap((p) => p.words)
    .slice(1);
  const nameT = M.endName!;
  const out = prog(t, 166.6, 168, easeOut);
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: 1 - out,
          transform: `translateY(${-60 * s}px)`,
        }}
      >
        <Mark size={170 * s} draw={clamp01((t - start) / 0.7)} drop={clamp01((t - (start + 0.35)) / 0.4)} />
        <div
          style={{
            marginTop: 40 * s,
            fontFamily: SANS,
            fontWeight: 650,
            fontSize: 96 * s,
            letterSpacing: '0.075em',
            color: C.ink,
            opacity: prog(t, nameT - 0.2, nameT + 0.25),
          }}
        >
          PLANRIFT
        </div>
        <div
          style={{
            marginTop: 56 * s,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 84 * s,
            letterSpacing: '-0.03em',
            color: C.ink,
            textAlign: 'center',
          }}
        >
          {words.map((w, i) => {
            const p = easeOut(clamp01((t - w.start + 0.05) / 0.3));
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: '0.24em',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 20 * s}px)`,
                  color: /breaks/.test(w.text) ? C.red : C.ink,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 90 * s,
            display: 'flex',
            gap: 80 * s,
            opacity: prog(t, 158.6, 159.3),
            transform: `translateY(${(1 - prog(t, 158.6, 159.3)) * 16 * s}px)`,
          }}
        >
          {[
            ['Try it, no sign-in', 'planrift-omega.vercel.app'],
            ['Source · MIT · .kiro included', 'github.com/AmirmLotfy/planrift'],
          ].map(([k, v]) => (
            <div
              key={v}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 * s, alignItems: 'center' }}
            >
              <span style={{ fontFamily: SANS, fontSize: 30 * s, fontWeight: 550, color: C.ink3 }}>{k}</span>
              <span style={{ fontFamily: MONO, fontSize: 44 * s, fontWeight: 500, color: C.gripInk }}>
                {v}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 70 * s,
            fontFamily: SANS,
            fontSize: 30 * s,
            fontWeight: 550,
            color: C.ink3,
            opacity: prog(t, 159.6, 160.3),
          }}
        >
          Built with Kiro · Kiroween 2026 · Frankenstein
        </div>
      </div>
    </AbsoluteFill>
  );
}
