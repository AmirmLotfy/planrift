import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { camAt, clamp01, type Key } from '../anim';
import { CAPTURES, CSS_H, CSS_W } from '../data';
import { C } from '../theme';

/**
 * A recording of the real app, filling the frame, with a camera (centre in capture CSS px + zoom)
 * and the logged pointer drawn on top. `t0` is the final-timeline time of the Sequence start and
 * `from` the capture time shown at that moment.
 */
export function Footage({
  name,
  t0,
  from,
  keys,
  cursor = true,
  overscan = false,
  children,
}: {
  name: string;
  t0: number;
  from: number;
  keys: readonly Key[];
  cursor?: boolean;
  /**
   * Lets the camera pull back below 1× and past the capture's edges, onto paper of the same colour
   * as the page. Used when the subject sits on the capture's bottom edge, under the captions.
   */
  overscan?: boolean;
  /** Overlays in capture CSS px (they move with the camera). */
  children?: ReactNode;
}) {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const t = t0 + frame / fps;
  const cam = camAt(t, keys);
  const k = width / CSS_W;
  const z = overscan ? cam.z : Math.max(1, cam.z);
  const hw = CSS_W / (2 * z);
  const hh = CSS_H / (2 * z);
  const cx = overscan ? cam.x : Math.min(CSS_W - hw, Math.max(hw, cam.x));
  const cy = overscan ? cam.y : Math.min(CSS_H - hh, Math.max(hh, cam.y));
  const captureFrame = Math.round(from * fps) + frame;
  const layer: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CSS_W * k,
    height: CSS_H * k,
    transformOrigin: '0 0',
    transform: `translate(${width / 2}px, ${height / 2}px) scale(${z}) translate(${-cx * k}px, ${-cy * k}px)`,
  };
  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, overflow: 'hidden' }}>
      <div style={layer}>
        <OffthreadVideo
          src={staticFile(`media/capture/${name}.mp4`)}
          trimBefore={Math.round(from * fps)}
          muted
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {overscan ? (
          // Content cut by the capture's bottom edge fades into the paper instead of ending on a line.
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 18 * k,
              background: `linear-gradient(to bottom, rgba(246,246,243,0), ${C.paper})`,
            }}
          />
        ) : null}
        <svg
          viewBox={`0 0 ${CSS_W} ${CSS_H}`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
        >
          {children}
          {cursor ? <Pointer name={name} frame={captureFrame} zoom={z} /> : null}
        </svg>
      </div>
    </AbsoluteFill>
  );
}

/** macOS-style arrow with a click ripple, from the positions logged during capture. */
function Pointer({ name, frame, zoom }: { name: string; frame: number; zoom: number }) {
  const cap = CAPTURES[name];
  if (!cap || !cap.cursor.length) return null;
  const at = cap.cursor[Math.min(cap.cursor.length - 1, Math.max(0, frame))];
  if (!at) return null;
  const [, x, y, down] = at;
  if (y > CSS_H + 10 || x < -10 || x > CSS_W + 10) return null;
  // Most recent press within 0.45 s → ripple.
  let pressAge = Infinity;
  for (let f = frame; f >= Math.max(1, frame - 14); f--) {
    const cur = cap.cursor[f];
    const prev = cap.cursor[f - 1];
    if (cur && prev && cur[3] === 1 && prev[3] === 0) {
      pressAge = frame - f;
      break;
    }
  }
  const s = 1.15 / Math.sqrt(zoom);
  const p = clamp01(pressAge / 14);
  return (
    <g>
      {pressAge !== Infinity ? (
        <circle
          cx={x}
          cy={y}
          r={6 + 22 * p}
          fill="none"
          stroke={C.grip}
          strokeWidth={2.4 * (1 - p)}
          opacity={1 - p}
        />
      ) : null}
      <g transform={`translate(${x} ${y}) scale(${s * (down ? 0.9 : 1)})`}>
        <path
          d="M0 0 L0 17.5 L4.4 13.4 L7.4 20.2 L10.4 18.9 L7.5 12.3 L13.4 12.3 Z"
          fill="#fff"
          stroke="#111315"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

/** Capture-space highlight ring (rounded rectangle) that draws on and fades. */
export function Ring({
  x,
  y,
  w,
  h,
  t,
  start,
  end,
  color = C.grip,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
  start: number;
  end: number;
  color?: string;
}) {
  if (t < start || t > end + 0.4) return null;
  const pIn = clamp01((t - start) / 0.45);
  const pOut = clamp01((t - end) / 0.4);
  const per = 2 * (w + h);
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={8}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeDasharray={per}
      strokeDashoffset={per * (1 - pIn)}
      opacity={1 - pOut}
    />
  );
}
