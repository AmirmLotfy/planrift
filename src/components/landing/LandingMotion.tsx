'use client';

import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/**
 * Landing-page motion layer.
 *  - Lenis smooth scroll (pointer devices only; touch keeps native momentum).
 *  - GSAP ScrollTrigger kept in sync with Lenis for scrubbed sections.
 *  - IntersectionObserver reveals: elements marked data-reveal / data-lines / data-rule get `is-in`.
 * Reduced motion: nothing is initialised and the reveal styles never apply (no `js-motion` class).
 */
export function LandingMotion() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    if (reduced) {
      root.classList.remove('js-motion');
      return;
    }
    root.classList.add('js-motion');
    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9, smoothWheel: true });
    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal], [data-lines], [data-rule]'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => observer.observe(el));

    // Anchor links go through Lenis so the eased scroll stays consistent.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute('href');
      const el = id && id.length > 1 ? document.querySelector<HTMLElement>(id) : null;
      if (!el) return;
      event.preventDefault();
      lenis.scrollTo(el, { offset: -8, duration: 1.4 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      observer.disconnect();
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      root.classList.remove('js-motion');
    };
  }, []);

  return null;
}
