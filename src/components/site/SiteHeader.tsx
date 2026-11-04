'use client';

/**
 * Floating site header. Logo, section navigation, a live status capsule of the landing model
 * (read from useHeroModel, written by the hero), the studio CTA, and a dimension-line scroll
 * gauge: the page is measured like the 6,000 mm wall. Below 760 px the navigation moves into a
 * disclosure sheet and the gauge becomes a 2 px progress hairline.
 */

import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Logo } from '@/components/brand/Logo';
import { useHeroModel } from '@/components/landing/heroState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import { formatMm } from '@/domain/format';
import { createAsterHouseScene, FLAGSHIP } from '@/domain/seed/asterHouse';
import css from './siteHeader.module.css';

const NAV = [
  { id: 'model', label: 'Model' },
  { id: 'fit', label: 'Where it fits' },
  { id: 'compare', label: 'Compare' },
  { id: 'review', label: 'Review' },
  { id: 'kiro', label: 'Kiro' },
] as const;

/** Length of R-512's south wall (the wall D-101 moves along); the gauge reads the page in it. */
const WALL_MM = createAsterHouseScene().rooms.find((r) => r.id === FLAGSHIP.roomId)!.widthMm;
const TICKS = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * WALL_MM));
const MOBILE_QUERY = '(max-width: 760px)';

function LiveCapsule({ className }: { className?: string }) {
  const hingeMm = useHeroModel((s) => s.hingeMm);
  const status = useHeroModel((s) => s.status);
  const headline = useHeroModel((s) => s.headline);
  return (
    <a href="#model" className={className} title={headline} aria-label={`Live model: ${FLAGSHIP.doorId} at ${formatMm(hingeMm)}, ${STATUS_LABEL[status]}. ${headline}`}>
      <span className={css.capsuleId}>{FLAGSHIP.doorId}</span>
      <span className={css.capsuleDot} aria-hidden="true" />
      <span className={css.capsuleMm}>{formatMm(hingeMm)}</span>
      <span key={status} className={css.capsuleBadge}>
        <StatusBadge status={status} size="sm" />
      </span>
    </a>
  );
}

export function SiteHeader() {
  const barRef = useRef<HTMLDivElement>(null);
  const readingRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Scroll gauge: one rAF per frame writes --p on the bar; React only re-renders when `scrolled` flips.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let frame = 0;
    let idle = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--p', p.toFixed(4));
      if (readingRef.current) readingRef.current.textContent = formatMm(Math.round((p * WALL_MM) / 10) * 10);
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
      bar.dataset.scrolling = 'true';
      window.clearTimeout(idle);
      idle = window.setTimeout(() => delete bar.dataset.scrolling, 900);
    };
    const onResize = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(idle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Current section: the one crossing the middle of the viewport.
  useEffect(() => {
    const sections = NAV.map((n) => document.getElementById(n.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id);
      },
      { rootMargin: '-48% 0px -51% 0px' },
    );
    sections.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Mobile sheet: focus the first link, Esc / outside press closes, focus returns to the button.
  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (e: globalThis.PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const mq = window.matchMedia(MOBILE_QUERY);
    const onMedia = () => {
      if (!mq.matches) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    mq.addEventListener('change', onMedia);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      mq.removeEventListener('change', onMedia);
    };
  }, [open]);

  const links = (onNavigate?: () => void) =>
    NAV.map((n) => (
      <li key={n.id}>
        <a href={`#${n.id}`} aria-current={active === n.id ? 'location' : undefined} onClick={onNavigate}>
          {n.label}
        </a>
      </li>
    ));

  return (
    <header className={css.header}>
      <div ref={barRef} className={css.bar} data-scrolled={scrolled || undefined} data-open={open || undefined} style={{ '--p': 0 } as CSSProperties}>
        <div className={css.row}>
          <Link href="/" className={css.brand} aria-label="PLANRIFT home">
            <Logo size={22} />
          </Link>
          <nav className={css.nav} aria-label="Sections">
            <ul>{links()}</ul>
          </nav>
          <div className={css.end}>
            <LiveCapsule className={css.capsule} />
            <Link href="/demo" className={css.cta} aria-label="Open the studio">
              <span className={css.ctaLong}>Open the studio</span>
              <span className={css.ctaShort}>Studio</span>
              <ArrowRight size={15} strokeWidth={2.2} aria-hidden="true" />
            </Link>
            <button
              ref={buttonRef}
              type="button"
              className={css.menuButton}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
        </div>

        <div className={css.gauge} aria-hidden="true">
          <span className={css.gaugeLine} />
          <span className={css.gaugeFill} />
          {TICKS.map((mm, i) => (
            <span key={mm} className={css.gaugeTick} data-end={i === TICKS.length - 1 || undefined} style={{ left: `${(i / (TICKS.length - 1)) * 100}%` }}>
              <span className={css.gaugeLabel}>{i === TICKS.length - 1 ? formatMm(mm) : formatMm(mm).replace(/\s*mm$/, '')}</span>
            </span>
          ))}
          <span className={css.gaugeMarker} />
          <span ref={readingRef} className={css.gaugeReading}>
            {formatMm(0)}
          </span>
        </div>

        <div id="site-menu" ref={menuRef} className={css.sheet} hidden={!open}>
          <nav aria-label="Sections">
            <ul>{links(() => setOpen(false))}</ul>
          </nav>
          <LiveCapsule className={css.sheetCapsule} />
        </div>
      </div>
    </header>
  );
}
