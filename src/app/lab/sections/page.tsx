import type { Metadata } from 'next';
import { ClosingCta } from '@/components/landing/ClosingCta';
import { CompareSheet } from '@/components/landing/CompareSheet';
import { HingeRuler } from '@/components/landing/HingeRuler';
import { KiroSection } from '@/components/landing/KiroSection';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { LimitsSection } from '@/components/landing/LimitsSection';
import { ReviewDocuments } from '@/components/landing/ReviewDocuments';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TitleBlockFooter } from '@/components/site/TitleBlockFooter';

/** Development preview for the landing sections without the WebGL stage. Removed before release. */
export const metadata: Metadata = { title: 'Lab · sections', robots: { index: false, follow: false } };

export default function SectionsLab() {
  return (
    <>
      <LandingMotion />
      <SiteHeader />
      <main style={{ paddingTop: 96 }}>
        <HingeRuler />
        <CompareSheet />
        <ReviewDocuments />
        <KiroSection />
        <LimitsSection />
        <ClosingCta />
      </main>
      <TitleBlockFooter />
    </>
  );
}
