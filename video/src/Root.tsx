import { Composition, Still } from 'remotion';
import './theme';
import { Demo } from './Demo';
import { Thumbnail } from './scenes/Thumbnail';

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="PlanriftDemo"
        component={Demo}
        durationInFrames={168 * 30}
        fps={30}
        width={2560}
        height={1440}
      />
      <Still
        id="ThumbYouTube"
        component={Thumbnail}
        width={1280}
        height={720}
        defaultProps={{ variant: 'youtube' as const }}
      />
      <Still
        id="ThumbDevpost"
        component={Thumbnail}
        width={1500}
        height={1000}
        defaultProps={{ variant: 'devpost' as const }}
      />
    </>
  );
}
