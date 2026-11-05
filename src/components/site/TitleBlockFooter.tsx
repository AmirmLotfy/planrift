/**
 * Site footer drawn as a drawing title block: brand, project, drawing, north point and units,
 * navigation, the site's revision table and the engine version. Values come from the sample
 * scene, the engine and content.ts; nothing is a placeholder.
 */

import Link from 'next/link';
import { LogoMark } from '@/components/brand/Logo';
import { SITE_REVISIONS } from '@/components/landing/content';
import { ENGINE_VERSION } from '@/domain/analysis/analyze';
import { createAsterHouseScene } from '@/domain/seed/asterHouse';
import css from './titleBlock.module.css';

const LINKS = [
  { href: '/demo', label: 'Studio' },
  { href: '/#model', label: 'Model' },
  { href: '/#fit', label: 'Where it fits' },
  { href: '/#compare', label: 'Compare' },
  { href: '/#review', label: 'Review' },
  { href: '/#kiro', label: 'Kiro' },
] as const;

export function TitleBlockFooter() {
  const { project } = createAsterHouseScene();
  return (
    <footer className={css.footer}>
      <div className={css.block}>
        <div className={`${css.cell} ${css.brand}`}>
          <span className={css.mark}>
            <LogoMark size={34} />
          </span>
          <div>
            <p className={css.brandName}>PLANRIFT</p>
            <p className={css.brandLine}>Architecture revision consequence studio</p>
          </div>
        </div>

        <div className={css.cell}>
          <p className={css.label}>Project</p>
          <p className={css.value}>{project.name}</p>
          <p className={css.sub}>
            {project.client} · {project.phase}
          </p>
        </div>

        <div className={css.cell}>
          <p className={css.label}>Drawing</p>
          <p className={css.value}>Landing page</p>
          <p className={css.sub}>Every figure on it is computed by the engine when the page is built or as you use it.</p>
        </div>

        <div className={`${css.cell} ${css.north}`}>
          <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" className={css.arrow}>
            <circle cx="20" cy="20" r="17" />
            <path d="M20 6l6 22-6-5-6 5z" />
          </svg>
          <div>
            <p className={css.label}>Units</p>
            <p className={css.value}>Millimetres</p>
            <p className={css.sub}>Whole mm; plans drawn north up</p>
          </div>
        </div>

        <nav className={`${css.cell} ${css.nav}`} aria-label="Footer">
          <p className={css.label}>Sheets</p>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={`${css.cell} ${css.revisions}`}>
          <p className={css.label}>Revisions</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Rev</th>
                <th scope="col">Date</th>
                <th scope="col">Description</th>
              </tr>
            </thead>
            <tbody>
              {SITE_REVISIONS.map((r) => (
                <tr key={r.rev}>
                  <td className={css.mono}>{r.rev}</td>
                  <td className={css.mono}>{r.date}</td>
                  <td>{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={css.cell}>
          <p className={css.label}>Engine</p>
          <p className={`${css.value} ${css.mono}`}>{ENGINE_VERSION}</p>
          <p className={css.sub}>Built with Kiro for Kiroween 2026</p>
        </div>

        <p className={css.small}>
          A fictional sample project. PLANRIFT records reviews; it does not certify compliance or approve construction. No cookies, no analytics and no
          third-party requests.
        </p>
      </div>
    </footer>
  );
}
