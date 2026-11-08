import { Freeze, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { CSS_H, CSS_W } from '../data';

/**
 * A crop of a real capture (region in capture CSS px) scaled to fill `width`×`height`.
 * `at` is the capture time at the clip's first frame; `freeze` holds that frame instead of playing.
 */
export function Clip({
  name,
  at,
  crop,
  width,
  height,
  freeze = false,
  drift = 0,
}: {
  name: string;
  at: number;
  crop: { x: number; y: number; w: number; h: number };
  width: number;
  height: number;
  freeze?: boolean;
  /** Slow push-in (fraction of zoom gained per second). */
  drift?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const z = 1 + drift * (frame / fps);
  const k = (width / crop.w) * z;
  const cx = crop.x + crop.w / 2;
  const cy = crop.y + crop.h / 2;
  const video = (
    <OffthreadVideo
      src={staticFile(`media/capture/${name}.mp4`)}
      trimBefore={Math.round(at * fps)}
      muted
      style={{
        position: 'absolute',
        left: width / 2 - cx * k,
        top: height / 2 - cy * k,
        width: CSS_W * k,
        height: CSS_H * k,
        maxWidth: 'none',
      }}
    />
  );
  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: '#F6F6F3' }}>
      {freeze ? <Freeze frame={0}>{video}</Freeze> : video}
    </div>
  );
}
