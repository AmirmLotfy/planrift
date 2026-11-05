/**
 * Scope, stated plainly: what the engine models and what PLANRIFT does not claim. Drawn as one
 * "general notes" sheet. Issue codes are the engine's own (src/domain/analysis/analyze.ts).
 */

import type { CSSProperties, ReactNode } from 'react';
import { RevealTitle } from '@/components/site/RevealTitle';
import { LIMITS, type LimitGlyph, type LimitItem } from './content';
import css from './limits.module.css';
import s from './sections.module.css';

const GLYPHS: Record<LimitGlyph, ReactNode> = {
  room: (
    <>
      <rect x="3" y="5" width="18" height="14" />
      <rect x="5.5" y="7.5" width="13" height="9" />
    </>
  ),
  door: (
    <>
      <path d="M2 20h4M18 20h4" />
      <path d="M6 20V8" strokeWidth="2.2" />
      <path d="M18 20A12 12 0 0 0 6 8" />
    </>
  ),
  furniture: (
    <>
      <rect x="4" y="7" width="16" height="10" />
      <path d="M8 17l6-10M12 17l6-10M4 13.5L8 7M16 17l4-6.5" strokeWidth="1" />
    </>
  ),
  scenarios: (
    <>
      <path d="M3 17h18" />
      <path d="M7 17c0-6 4-8 9-8h5" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="21" cy="9" r="1.2" />
      <circle cx="21" cy="17" r="1.2" />
    </>
  ),
  exports: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M12 10v7M9 14l3 3 3-3" />
    </>
  ),
  compliance: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
    </>
  ),
  approval: (
    <>
      <circle cx="12" cy="11" r="7" />
      <path d="M8.5 11l2.4 2.4 4.6-4.8" />
      <path d="M7 21h10" />
    </>
  ),
  cad: (
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M9 12l3 4 3-4M12 8v8" />
    </>
  ),
  edits: (
    <>
      <path d="M4 20l1-4L16 5l3 3L8 19z" />
      <path d="M14 7l3 3" />
    </>
  ),
  shapes: (
    <>
      <path d="M7 4l12 5-4 11-12-5z" />
      <path d="M2 21h20" strokeDasharray="2 2" />
    </>
  ),
};

function Note({ item, n, struck }: { item: LimitItem; n: number; struck: boolean }) {
  return (
    <li className={css.note} data-struck={struck || undefined}>
      <span className={css.n}>{String(n).padStart(2, '0')}</span>
      <svg className={css.glyph} viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
        <g className={css.ink}>{GLYPHS[item.glyph]}</g>
        {struck ? <path className={css.strike} d="M3 21L21 3" /> : null}
      </svg>
      <div className={css.text}>
        <p className={css.noteTitle}>{item.title}</p>
        <p className={css.noteDetail}>{item.detail}</p>
        {item.codes?.length ? (
          <p className={css.codes}>
            {item.codes.map((c) => (
              <code key={c}>{c}</code>
            ))}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export function LimitsSection() {
  return (
    <section id="limits" className={s.section} aria-labelledby="limits-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={`${s.head} ${s.headSplit}`}>
          <RevealTitle id="limits-title" className={s.title} lines={['Exact about one problem.', 'Silent about the rest.']} />
          <p className={s.dek} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
            The engine solves single-leaf door swings against rectangular furniture in whole millimetres. Anything outside that model is reported as Unsupported,
            never guessed, and nothing here is a compliance or approval tool.
          </p>
        </div>

        <div className={css.sheet} data-reveal="" style={{ '--i': 2 } as CSSProperties}>
          <div className={css.half}>
            <h3 className={css.halfHead}>
              <span>Modelled</span>
              <span className={css.halfSub}>computed by the engine, tested</span>
            </h3>
            <ol className={css.notes}>
              {LIMITS.modelled.map((item, i) => (
                <Note key={item.title} item={item} n={i + 1} struck={false} />
              ))}
            </ol>
          </div>
          <div className={css.half}>
            <h3 className={css.halfHead}>
              <span>Not claimed</span>
              <span className={css.halfSub}>out of scope on purpose</span>
            </h3>
            <ol className={css.notes} start={LIMITS.modelled.length + 1}>
              {LIMITS.notClaimed.map((item, i) => (
                <Note key={item.title} item={item} n={LIMITS.modelled.length + i + 1} struck />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
