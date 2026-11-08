import { AbsoluteFill } from 'remotion';
import { Clip } from '../components/Clip';
import { Mark } from '../components/Mark';
import { C, MONO, SANS } from '../theme';

/**
 * Thumbnails made from a real frame of the app (the white model at Revision A, 3,000 mm, where the
 * engine reports the strike), plus type. YouTube 16:9 and Devpost 3:2.
 */
export function Thumbnail({ variant }: { variant: 'youtube' | 'devpost' }) {
  const yt = variant === 'youtube';
  const W = yt ? 1280 : 1500;
  const H = yt ? 720 : 1000;
  const shotW = yt ? 760 : 1500;
  const shotH = yt ? 720 : 560;
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, fontFamily: SANS }}>
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: yt ? 0 : undefined,
          bottom: yt ? undefined : 0,
          width: shotW,
          height: shotH,
        }}
      >
        {/* Crops start right of x = 600 so none of the landing headline beside the model shows. */}
        <Clip
          name="c1-hero"
          at={9.7}
          crop={yt ? { x: 760, y: 70, w: 640, h: 607 } : { x: 612, y: 92, w: 828, h: 309 }}
          width={shotW}
          height={shotH}
          freeze
        />
        {/* Fade the shot into the paper on its inner edge so the type sits on clean ground. */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: yt
              ? `linear-gradient(90deg, ${C.paper} 0%, rgba(246,246,243,0) 28%)`
              : `linear-gradient(180deg, ${C.paper} 0%, rgba(246,246,243,0) 26%)`,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: yt ? 64 : 80,
          top: yt ? 60 : 70,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <Mark size={yt ? 44 : 50} draw={1} drop={1} />
        <span style={{ fontWeight: 650, fontSize: yt ? 30 : 34, letterSpacing: '0.075em', color: C.ink }}>
          PLANRIFT
        </span>
      </div>
      <div style={{ position: 'absolute', left: yt ? 64 : 80, top: yt ? 214 : 170, width: yt ? 760 : 1340 }}>
        {/* Each headline line stays on one line; at thumbnail size a wrapped highlight reads as a block. */}
        <div
          style={{
            fontWeight: 650,
            fontSize: yt ? 92 : 112,
            lineHeight: 0.98,
            letterSpacing: '-0.045em',
            color: C.ink,
            whiteSpace: 'nowrap',
          }}
        >
          One door.
          <br />
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span
              style={{
                position: 'absolute',
                left: -8,
                right: -10,
                top: '18%',
                bottom: '4%',
                background: C.hi,
                transform: 'skewX(-10deg) rotate(-1deg)',
                borderRadius: 8,
                zIndex: 0,
              }}
            />
            <span style={{ position: 'relative' }}>Three drawings.</span>
          </span>
        </div>
        {/* YouTube shows the title beside the thumbnail, so the thumbnail keeps only the headline. */}
        {yt ? null : (
          <div
            style={{
              marginTop: 30,
              fontSize: 34,
              fontWeight: 550,
              color: C.ink2,
              lineHeight: 1.3,
              maxWidth: 1100,
            }}
          >
            See what a revision breaks before it’s issued.
          </div>
        )}
        <div
          style={{
            marginTop: yt ? 44 : 24,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 10,
            background: C.sheet,
            boxShadow: `0 0 0 2px ${C.red}`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: C.red }} />
          <span style={{ fontFamily: MONO, fontSize: yt ? 26 : 28, fontWeight: 600, color: C.redInk }}>
            D-101 strikes F-07 at 15.7°
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
