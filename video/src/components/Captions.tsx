import { useCurrentFrame, useVideoConfig } from 'remotion';
import { clamp01 } from '../anim';
import { EVENTS } from '../data';
import { C, SANS } from '../theme';

/** Burned-in captions from the recorded voiceover's word timings; current word underlined. */
export function Captions({ hide = [] }: { hide?: readonly string[] }) {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const pages = EVENTS.captions.filter((c) => !hide.includes(c.id)).flatMap((c) => c.pages);
  const idx = pages.findIndex((p, i) => {
    const next = pages[i + 1];
    return t >= p.start - 0.12 && t < (next ? Math.min(next.start - 0.12, p.end + 0.6) : p.end + 0.6);
  });
  const page = pages[idx];
  if (!page) return null;
  const fadeIn = clamp01((t - (page.start - 0.12)) / 0.12);
  const fadeOut = clamp01((page.end + 0.6 - t) / 0.18);
  const scale = width / 2560;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 74 * scale,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1900 * scale,
          padding: `${16 * scale}px ${30 * scale}px ${19 * scale}px`,
          borderRadius: 18 * scale,
          background: 'rgba(17,19,21,0.86)',
          boxShadow: '0 18px 40px -22px rgba(17,19,21,0.6)',
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 46 * scale,
          lineHeight: 1.22,
          letterSpacing: '-0.01em',
          color: '#fff',
          textAlign: 'center',
          opacity: Math.min(fadeIn, fadeOut),
          transform: `translateY(${(1 - fadeIn) * 8 * scale}px)`,
        }}
      >
        {page.words.map((w, i) => {
          const spoken = t >= w.start - 0.02;
          const current = spoken && t < w.end + 0.06;
          return (
            <span
              key={i}
              style={{
                position: 'relative',
                color: spoken ? '#fff' : 'rgba(255,255,255,0.42)',
                marginRight: i < page.words.length - 1 ? '0.28em' : 0,
              }}
            >
              {w.text}
              {current ? (
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: -5 * scale,
                    height: 5 * scale,
                    borderRadius: 3 * scale,
                    background: C.hi,
                  }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
