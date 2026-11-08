import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01, easeIn, easeOut, prog } from '../anim';
import { Mark } from '../components/Mark';
import { EVENTS } from '../data';
import { C, MONO, SANS } from '../theme';

/** Title card: the mark inks itself, the redline block lands on the hit, then VO-03 as type. */
export function Title({ start }: { start: number }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = start + frame / fps;
  const s = width / 2560;
  const lt = t - start;
  const hit = 14.95;
  const line = EVENTS.captions
    .find((c) => c.id === 'VO-03')!
    .pages.flatMap((p) => p.words)
    .slice(1);
  const enter = prog(t, start, start + 0.45);
  const exit = prog(t, 22.2, 22.86, easeIn);
  const letters = 'PLANRIFT'.split('');
  return (
    <AbsoluteFill
      style={{ backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', opacity: enter }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `translateY(${-40 * s - exit * 30 * s}) scale(${1 + exit * 0.06})`,
          opacity: 1 - exit,
        }}
      >
        <div
          style={{
            transform: `scale(${1 + 0.05 * Math.exp(-Math.max(0, t - hit) / 0.18) * (t > hit ? 1 : 0)})`,
          }}
        >
          <Mark size={250 * s} draw={clamp01(lt / 1.0)} drop={clamp01((t - (hit - 0.2)) / 0.42)} />
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 58 * s,
            fontFamily: SANS,
            fontWeight: 650,
            fontSize: 132 * s,
            letterSpacing: '0.075em',
            color: C.ink,
            lineHeight: 1,
          }}
        >
          {letters.map((ch, i) => {
            const p = easeOut(clamp01((t - (hit + 0.05 + i * 0.045)) / 0.5));
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${(1 - p) * 40 * s}px)`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 26 * s,
            fontFamily: MONO,
            fontSize: 30 * s,
            letterSpacing: '0.04em',
            color: C.ink3,
            opacity: prog(t, hit + 0.5, hit + 1.2),
          }}
        >
          Architecture revision consequence studio
        </div>
        <div
          style={{
            marginTop: 70 * s,
            maxWidth: 1800 * s,
            textAlign: 'center',
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 68 * s,
            letterSpacing: '-0.025em',
            lineHeight: 1.12,
            color: C.ink,
          }}
        >
          {line.map((w, i) => {
            const p = easeOut(clamp01((t - w.start + 0.05) / 0.32));
            const key = /issued/i.test(w.text);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  marginRight: '0.26em',
                  opacity: 0.12 + 0.88 * p,
                  transform: `translateY(${(1 - p) * 16 * s}px)`,
                  color: key ? C.red : C.ink,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
