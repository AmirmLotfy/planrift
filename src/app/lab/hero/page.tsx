import type { Metadata } from 'next';
import { HeroStage } from '@/components/landing/HeroStage';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { SiteHeader } from '@/components/site/SiteHeader';

/** Development preview for the hero/story stage in isolation. Removed before release. */
export const metadata: Metadata = { title: 'Lab · hero', robots: { index: false, follow: false } };

export default function HeroLab() {
  return (
    <>
      <LandingMotion />
      <SiteHeader />
      <main>
        <HeroStage />
        <div style={{ height: '60vh' }} />
      </main>
    </>
  );
}
