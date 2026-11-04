import type { Metadata } from 'next';
import { HeroStage } from '@/components/landing/HeroStage';
import { LandingMotion } from '@/components/landing/LandingMotion';

/** Development preview for the hero/story stage in isolation. Removed before release. */
export const metadata: Metadata = { title: 'Lab · hero', robots: { index: false, follow: false } };

export default function HeroLab() {
  return (
    <>
      <LandingMotion />
      {/* The real header floats 72 px tall over the stage; it is omitted here to keep this lab isolated. */}
      <main>
        <HeroStage />
        <div style={{ height: '60vh' }} />
      </main>
    </>
  );
}
