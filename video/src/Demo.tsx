import type { ReactNode } from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { easeOut, prog, type Key } from './anim';
import { Captions } from './components/Captions';
import { ChapterTag, Figure } from './components/Chip';
import { Clip } from './components/Clip';
import { ENGINE } from './components/Engine';
import { Footage, Ring } from './components/Footage';
import { M, boxOf, type Box } from './data';
import { End } from './scenes/End';
import { Open } from './scenes/Open';
import { Stitch } from './scenes/Stitch';
import { Title } from './scenes/Title';
import { C, MONO, SANS } from './theme';

const FPS = 30;
const f = (s: number) => Math.round(s * FPS);

/** A Sequence on the final timeline in seconds, with a short fade-in. */
function Shot({
  from,
  to,
  fade = 0.25,
  children,
}: {
  from: number;
  to: number;
  fade?: number;
  children: ReactNode;
}) {
  return (
    <Sequence from={f(from)} durationInFrames={f(to) - f(from)} name={`${from.toFixed(2)}–${to.toFixed(2)}`}>
      <FadeIn fade={fade}>{children}</FadeIn>
    </Sequence>
  );
}

function FadeIn({ fade, children }: { fade: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const o = fade <= 0 ? 1 : easeOut(Math.min(1, frame / (fade * fps)));
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
}

/** Live footage shot: capture `name` from capture time `from` at final time `t0`. */
function Rec({
  name,
  t0,
  t1,
  from,
  keys,
  fade,
  children,
  cursor,
  overscan,
}: {
  name: string;
  t0: number;
  t1: number;
  from: number;
  keys: Key[];
  fade?: number;
  children?: ReactNode;
  cursor?: boolean;
  overscan?: boolean;
}) {
  return (
    <Shot from={t0} to={t1} fade={fade}>
      <Footage name={name} t0={t0} from={from} keys={keys} cursor={cursor} overscan={overscan}>
        {children}
      </Footage>
    </Shot>
  );
}

/** A Ring around an element box that the capture logged, with breathing room. */
function BoxRing({
  box,
  pad,
  ...rest
}: {
  box: Box;
  pad: number;
  t: number;
  start: number;
  end: number;
  color?: string;
}) {
  return <Ring x={box.x - pad} y={box.y - pad} w={box.w + 2 * pad} h={box.h + 2 * pad} {...rest} />;
}

function Time({ children }: { children: (t: number) => ReactNode }) {
  const frame = useCurrentFrame();
  return <>{children(frame / FPS)}</>;
}

function MathCard({ start, end }: { start: number; end: number }) {
  return (
    <Time>
      {(t) => {
        if (t < start || t > end + 0.4) return null;
        const p = easeOut(prog(t, start, start + 0.5));
        const o = 1 - prog(t, end, end + 0.4);
        return (
          <div
            style={{
              position: 'absolute',
              left: 96,
              bottom: 230,
              padding: '34px 42px 38px',
              borderRadius: 22,
              background: 'rgba(255,255,255,0.97)',
              boxShadow: `0 0 0 2px ${C.rule2}, 0 34px 70px -34px rgba(17,19,21,0.55)`,
              opacity: p * o,
              transform: `translateY(${(1 - p) * 30}px)`,
            }}
          >
            <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.ink2, marginBottom: 18 }}>
              Revision A, decided without rounding
            </div>
            <div style={{ fontFamily: MONO, fontSize: 38, color: C.ink, lineHeight: 1.6 }}>
              {ENGINE.math.display}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 38, color: C.ink, lineHeight: 1.6 }}>
              {ENGINE.math.exact}{' '}
              <span style={{ color: C.redInk, fontWeight: 600 }}>{ENGINE.math.verdict}</span>
            </div>
          </div>
        );
      }}
    </Time>
  );
}

export function Demo() {
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <Audio src={staticFile('media/mix.wav')} />

      {/* 0:00 Cold open, drawn by the engine */}
      <Shot from={0} to={14.1} fade={0}>
        <Open />
      </Shot>
      <Shot from={13.74} to={22.86} fade={0}>
        <Title start={13.74} />
      </Shot>

      {/* Live model on the landing page */}
      <Rec
        name="c1-hero"
        t0={22.86}
        t1={38.82}
        from={0}
        fade={0.35}
        keys={[
          { t: 22.86, x: 720, y: 405, z: 1 },
          { t: 26.9, x: 720, y: 405, z: 1 },
          { t: 28.7, x: 965, y: 385, z: 1.3 },
          { t: 37.0, x: 965, y: 385, z: 1.3 },
          { t: 38.82, x: 900, y: 400, z: 1.16 },
        ]}
      />

      {/* Studio: the approved plan */}
      <Rec
        name="c2-studio"
        t0={38.82}
        t1={46.35}
        from={0}
        keys={[
          { t: 38.82, x: 720, y: 405, z: 1 },
          { t: 41.7, x: 720, y: 405, z: 1 },
          { t: 43.3, x: 660, y: 430, z: 1.38 },
          { t: 44.6, x: 660, y: 430, z: 1.38 },
          { t: 45.6, x: 672, y: 560, z: 2.15 },
        ]}
      >
        <Time>{(t) => <Ring x={628} y={548} w={98} h={26} t={38.82 + t} start={45.1} end={46.3} />}</Time>
      </Rec>
      <Figure
        value={ENGINE.clearBase}
        unit="mm"
        label="D-101 clears console F-07"
        start={45.0}
        end={46.3}
        x={110}
        y={420}
        color={C.passInk}
        align="right"
      />

      {/* Landing: the hinge map, read across the whole wall. The strip is on the capture's bottom
          edge, so the camera pulls back (overscan) to lift it clear of the captions. */}
      <Rec
        name="c7-ruler"
        t0={46.35}
        t1={53.9}
        // The strip's bands appear when the pointer reaches it (capture 2.97 s), on the word "shows".
        from={2.3}
        fade={0.18}
        overscan
        keys={[
          { t: 46.35, x: 720, y: 455, z: 0.88 },
          { t: 53.9, x: 720, y: 452, z: 0.9 },
        ]}
      />

      {/* Studio: Revision A at 3,000 mm */}
      <Rec
        name="c2-studio"
        t0={53.9}
        t1={68.45}
        from={53.9 - 38.82}
        fade={0.18}
        keys={[
          { t: 53.9, x: 720, y: 405, z: 1 },
          { t: 55.2, x: 720, y: 405, z: 1 },
          { t: 55.95, x: 1180, y: 292, z: 1.75 },
          { t: 59.28, x: 1180, y: 292, z: 1.75 },
          { t: 59.85, x: 650, y: 330, z: 1.3, e: easeOut },
          { t: 60.6, x: 650, y: 330, z: 1.3 },
          { t: 61.6, x: 712, y: 548, z: 2.55 },
          { t: 68.45, x: 716, y: 548, z: 2.7 },
        ]}
      >
        <Time>
          {(t) => <Ring x={256} y={110} w={790} h={48} t={53.9 + t} start={59.5} end={60.9} color={C.red} />}
        </Time>
      </Rec>
      <Figure
        value={`${ENGINE.strike}°`}
        label="D-101 opens only"
        start={M.fifteen! - 0.05}
        end={67.6}
        x={110}
        y={300}
        color={C.redInk}
        align="right"
      />
      <Figure
        value={ENGINE.intrusion}
        unit="mm"
        label="Pushes into console F-07"
        start={M.push! + 0.1}
        end={67.6}
        x={110}
        y={640}
        color={C.redInk}
        align="right"
      />

      {/* Landing: the same scene as model and as drawing */}
      <Rec
        name="c6-story"
        t0={68.45}
        t1={73.6}
        from={0}
        fade={0.2}
        cursor={false}
        keys={[
          { t: 68.45, x: 720, y: 405, z: 1.0 },
          { t: 73.6, x: 720, y: 405, z: 1.06 },
        ]}
      />

      {/* Studio: 3D view, then Revision B at 2,400 mm */}
      <Rec
        name="c2-studio"
        t0={73.6}
        t1={84.42}
        from={73.6 - 38.82}
        fade={0.2}
        keys={[
          { t: 73.6, x: 650, y: 420, z: 1.22 },
          { t: 75.4, x: 650, y: 420, z: 1.22 },
          { t: 76.1, x: 720, y: 405, z: 1 },
          { t: 77.0, x: 720, y: 405, z: 1 },
          { t: 77.7, x: 1180, y: 292, z: 1.75 },
          { t: 79.32, x: 1180, y: 292, z: 1.75 },
          { t: 79.95, x: 760, y: 420, z: 1.12, e: easeOut },
          { t: 81.2, x: 720, y: 405, z: 1.04 },
        ]}
      />
      <MathCard start={74.0} end={77.0} />
      <Figure
        value={ENGINE.clearB}
        unit="mm"
        label="Full 90° swing, console F-07 clear"
        start={M.clear391! - 0.05}
        end={84.2}
        x={110}
        y={240}
        color={C.passInk}
        align="right"
      />

      {/* Landing: the drawings that must be reissued (the page scroll is in the capture; the camera follows each sheet) */}
      <Rec
        name="c3-review"
        t0={84.42}
        t1={100.38}
        from={0}
        fade={0.2}
        cursor={false}
        keys={[
          { t: 84.42, x: 720, y: 405, z: 1 },
          { t: 88.6, x: 720, y: 405, z: 1 },
          { t: 89.15, x: 452, y: 470, z: 1.32 },
          { t: 89.8, x: 452, y: 470, z: 1.32 },
          { t: 90.4, x: 480, y: 513, z: 1.32 },
          { t: 91.0, x: 480, y: 513, z: 1.32 },
          { t: 91.6, x: 508, y: 513, z: 1.32 },
          { t: 92.45, x: 508, y: 513, z: 1.32 },
          { t: 93.0, x: 660, y: 420, z: 1.06 },
          { t: 96.35, x: 660, y: 420, z: 1.06 },
          { t: 97.3, x: 514, y: 530, z: 1.4 },
          { t: 100.38, x: 514, y: 530, z: 1.46 },
        ]}
      >
        <Time>
          {(t) => (
            <>
              {(['badge0', 'badge1', 'badge2'] as const).map((k, i) => (
                <BoxRing
                  key={k}
                  box={boxOf('c3-review', k)}
                  pad={6}
                  t={84.42 + t}
                  start={M.flags! - 0.05 + i * 0.4}
                  end={96.2}
                />
              ))}
              <BoxRing
                box={boxOf('c3-review', 'note')}
                pad={9}
                t={84.42 + t}
                start={M.nextDoor! - 0.2}
                end={100.3}
                color={C.pass}
              />
            </>
          )}
        </Time>
      </Rec>

      {/* Studio: compare, review, accept, receipt */}
      <Rec
        name="c4-decide"
        t0={100.38}
        t1={111.78}
        from={0}
        fade={0.2}
        keys={[
          { t: 100.38, x: 720, y: 405, z: 1 },
          { t: 102.6, x: 720, y: 405, z: 1 },
          { t: 103.3, x: 720, y: 405, z: 1.28 },
          { t: 106.6, x: 720, y: 405, z: 1.28 },
          { t: 107.4, x: 720, y: 440, z: 1.4 },
          { t: 109.3, x: 720, y: 440, z: 1.4 },
          { t: 109.9, x: 640, y: 376, z: 2.15 },
        ]}
      >
        <Time>{(t) => <Ring x={426} y={340} w={330} h={74} t={100.38 + t} start={109.7} end={111.6} />}</Time>
      </Rec>

      {/* Under the hood */}
      <Shot from={111.78} to={130.0} fade={0.25}>
        <Stitch />
      </Shot>

      {/* Built with Kiro: the landing page reads .kiro/ at build time. One continuous capture:
          title, then the specs / steering / agents columns as they are named, then the six hooks. */}
      <Rec
        name="c5-kiro"
        t0={130.0}
        t1={144.27}
        from={0}
        fade={0.3}
        cursor={false}
        keys={[
          // Zoom stays ≤ 1.05 so the 48 px page margins (and the rings around the outer columns) stay in frame.
          { t: 130.0, x: 720, y: 405, z: 1 },
          { t: 131.6, x: 720, y: 405, z: 1 },
          { t: 132.3, x: 720, y: 425, z: 1.02 },
          { t: 136.0, x: 720, y: 425, z: 1.03 },
          { t: 136.9, x: 720, y: 420, z: 1 },
          { t: 144.27, x: 720, y: 440, z: 1.05 },
        ]}
      >
        <Time>
          {(t) => (
            <>
              <BoxRing
                box={boxOf('c5-kiro', 'specs')}
                pad={12}
                t={130 + t}
                start={M.specs! - 0.1}
                end={135.85}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'steering')}
                pad={12}
                t={130 + t}
                start={M.steering! - 0.1}
                end={135.85}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'agents')}
                pad={12}
                t={130 + t}
                start={M.agents! - 0.1}
                end={135.85}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'stations')}
                pad={10}
                t={130 + t}
                start={M.hooks! - 0.05}
                end={M.tests! - 0.25}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'task-start-gate')}
                pad={4}
                t={130 + t}
                start={M.tests! - 0.1}
                end={M.secrets! - 0.2}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'task-completion-gate')}
                pad={4}
                t={130 + t}
                start={M.tests! - 0.1}
                end={M.secrets! - 0.2}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'secret-guard')}
                pad={4}
                t={130 + t}
                start={M.secrets! - 0.1}
                end={M.nothing! - 0.2}
              />
              <BoxRing
                box={boxOf('c5-kiro', 'public-action-guard')}
                pad={4}
                t={130 + t}
                start={M.nothing! - 0.1}
                end={144.2}
              />
            </>
          )}
        </Time>
      </Rec>

      {/* Reel on the beat: real shots only */}
      {REEL.map((r, i) => (
        <Shot key={i} from={r.t0} to={r.t1} fade={0}>
          <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper }}>
            <Clip name={r.name} at={r.at} crop={r.crop} width={2560} height={1440} drift={0.05} />
          </AbsoluteFill>
        </Shot>
      ))}

      <Shot from={153.85} to={168} fade={0.2}>
        <End start={153.85} />
      </Shot>

      {/* Chapter tags */}
      <ChapterTag n="01" label="The live model" start={23.1} end={26.3} />
      <ChapterTag n="02" label="The approved plan" start={39.0} end={41.4} />
      <ChapterTag n="03" label="Revision A · 3,000 mm" start={54.0} end={55.5} />
      <ChapterTag n="04" label="Revision B · 2,400 mm" start={75.9} end={77.3} />
      <ChapterTag n="05" label="Drawings to reissue" start={84.7} end={88.0} />
      <ChapterTag n="06" label="Compare and decide" start={100.55} end={102.3} />
      <ChapterTag n="07" label="Under the hood" start={112.0} end={114.5} />
      <ChapterTag n="08" label="Built with Kiro" start={130.2} end={132.2} />

      <Captions hide={['VO-03', 'VO-18']} />
    </AbsoluteFill>
  );
}

/** Beat grid: 0.57 s per beat from 0.06 s; two beats per shot. */
const BEAT = 0.57;
const beat = (n: number) => 0.06 + n * BEAT;
const shots: { name: string; at: number; crop: { x: number; y: number; w: number; h: number } }[] = [
  { name: 'c1-hero', at: 8.0, crop: { x: 604, y: 70, w: 836, h: 470 } },
  { name: 'c2-studio', at: 21.0, crop: { x: 250, y: 100, w: 820, h: 461 } },
  { name: 'c6-story', at: 1.6, crop: { x: 380, y: 60, w: 1060, h: 596 } },
  { name: 'c7-ruler', at: 5.0, crop: { x: 120, y: 280, w: 1200, h: 675 } },
  { name: 'c3-review', at: 2.2, crop: { x: 40, y: 290, w: 900, h: 506 } },
  { name: 'c4-decide', at: 1.6, crop: { x: 0, y: 40, w: 1440, h: 810 } },
  { name: 'c4-decide', at: 8.8, crop: { x: 300, y: 110, w: 840, h: 473 } },
  { name: 'c2-studio', at: 42.4, crop: { x: 240, y: 60, w: 820, h: 461 } },
];
const REEL = shots.map((s, i) => ({
  ...s,
  t0: beat(253 + i * 2),
  t1: i === shots.length - 1 ? 153.85 : beat(255 + i * 2),
}));
