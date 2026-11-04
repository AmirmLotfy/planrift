import { ClosingCta } from '@/components/landing/ClosingCta';
import { CompareSheet } from '@/components/landing/CompareSheet';
import { HeroStage } from '@/components/landing/HeroStage';
import { HingeRuler } from '@/components/landing/HingeRuler';
import { KiroSection } from '@/components/landing/KiroSection';
import { LandingMotion } from '@/components/landing/LandingMotion';
import { LimitsSection } from '@/components/landing/LimitsSection';
import { ReviewDocuments } from '@/components/landing/ReviewDocuments';
import { SiteHeader } from '@/components/site/SiteHeader';
import { TitleBlockFooter } from '@/components/site/TitleBlockFooter';

/** Reveal styles apply only when motion will run; content stays visible without JS. */
const MOTION_BOOT = "if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('js-motion')";

export default function LandingPage() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      <LandingMotion />
      <a href="#main" className="visually-hidden">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <HeroStage />
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
