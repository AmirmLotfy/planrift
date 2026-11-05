/**
 * How PLANRIFT was built with Kiro. Everything here is read from the repository's .kiro folder
 * when the page is built (kiroInventory): the hook pipeline, spec task progress, custom agents
 * and steering files. Nothing is typed in; if .kiro is missing the section says so.
 */

import type { CSSProperties } from 'react';
import { RevealTitle } from '@/components/site/RevealTitle';
import { HOOK_STEPS, kiroInventory } from './content';
import css from './kiro.module.css';
import s from './sections.module.css';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function GateGlyph({ gate }: { gate: boolean }) {
  // Gate: two posts and a bar (the action can be stopped). Hook: a plain station dot.
  return gate ? (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={css.glyph}>
      <rect x="1" y="1" width="20" height="20" rx="3" className={css.glyphBox} />
      <path d="M6 16V6M16 16V6M4.5 9.5h13" className={css.glyphInk} />
    </svg>
  ) : (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className={css.glyph}>
      <circle cx="11" cy="11" r="5" className={css.glyphDot} />
    </svg>
  );
}

export function KiroSection() {
  const inv = kiroInventory();
  const steps = inv
    ? HOOK_STEPS.map((step) => ({ step, hook: inv.hooks.find((h) => h.file === step.file) })).filter(
        (x): x is { step: (typeof HOOK_STEPS)[number]; hook: NonNullable<typeof x.hook> } => Boolean(x.hook),
      )
    : [];
  const done = inv?.specs.reduce((n, sp) => n + sp.done, 0) ?? 0;
  const total = inv?.specs.reduce((n, sp) => n + sp.total, 0) ?? 0;

  return (
    <section id="kiro" className={s.section} aria-labelledby="kiro-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={`${s.head} ${s.headSplit}`}>
          <RevealTitle id="kiro-title" className={s.title} lines={['Kiro built it.', 'Hooks kept it honest.']} />
          <p className={s.dek} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
            {inv ? (
              <>
                The work ran through {plural(inv.specs.length, 'spec')} ({done} of {total} tasks done), {plural(inv.steering.length, 'steering file')} and{' '}
                {plural(inv.agents.length, 'custom agent')}. {plural(steps.length, 'hook')} decide what the agent may do on its own. This page reads them from{' '}
                <code className={s.mono}>.kiro/</code> when it is built.
              </>
            ) : (
              'The .kiro folder was not available when this page was built.'
            )}
          </p>
        </div>

        {steps.length ? (
          <figure className={css.pipeline} data-reveal="" style={{ '--i': 2 } as CSSProperties}>
            <figcaption className={css.pipeHead}>
              <span>.kiro/hooks · in the order they fire during a session</span>
              <span className={css.legendKey}>
                <GateGlyph gate /> can stop the action
              </span>
            </figcaption>
            <ol className={css.stations} style={{ '--n': steps.length } as CSSProperties}>
              {steps.map(({ step, hook }, i) => (
                <li key={step.file} className={css.station} data-gate={step.gate || undefined} style={{ '--i': i } as CSSProperties}>
                  <p className={css.when}>
                    <span className={css.trigger}>{hook.trigger}</span>
                    {step.when}
                  </p>
                  <div className={css.node}>
                    <GateGlyph gate={step.gate} />
                  </div>
                  <div className={css.then}>
                    <p className={css.thenText}>{step.then}</p>
                    <p className={css.file}>{step.file.replace(/\.json$/, '')}</p>
                    {hook.command ? <code className={css.cmd}>{hook.command}</code> : null}
                  </div>
                </li>
              ))}
            </ol>
          </figure>
        ) : null}

        {inv ? (
          <div className={css.schedule} data-reveal="" style={{ '--i': 3 } as CSSProperties}>
            <section className={css.col} aria-labelledby="kiro-specs">
              <h3 id="kiro-specs" className={css.colHead}>
                <span>Specs</span>
                <span className={css.count}>
                  {done}/{total} tasks
                </span>
              </h3>
              <ul className={css.rows}>
                {inv.specs.map((sp) => (
                  <li key={sp.name} className={css.specRow}>
                    <span className={css.name}>{sp.name}</span>
                    <span className={css.meter} aria-hidden="true">
                      <span style={{ width: `${sp.total ? (sp.done / sp.total) * 100 : 0}%` }} />
                    </span>
                    <span className={css.tasks}>
                      {sp.done}/{sp.total}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={css.col} aria-labelledby="kiro-agents">
              <h3 id="kiro-agents" className={css.colHead}>
                <span>Custom agents</span>
                <span className={css.count}>{inv.agents.length}</span>
              </h3>
              <ul className={css.rows}>
                {inv.agents.map((a) => (
                  <li key={a.name} className={css.agentRow}>
                    <span className={css.name}>{a.name}</span>
                    <span className={css.summary}>{a.summary}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className={css.col} aria-labelledby="kiro-steering">
              <h3 id="kiro-steering" className={css.colHead}>
                <span>Steering</span>
                <span className={css.count}>{inv.steering.length}</span>
              </h3>
              <ul className={css.rows}>
                {inv.steering.map((st) => (
                  <li key={st.name} className={css.steerRow}>
                    <span className={css.name}>{st.name}</span>
                    <span className={css.inclusion} data-mode={st.inclusion}>
                      {st.inclusion === 'fileMatch' ? 'file match' : st.inclusion}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
