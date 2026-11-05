/**
 * Closing call to action. The page ends as a drawing sheet: Level 5 after the accepted
 * Revision B, drawn by the same PlanDrawing as the studio, with the site footer as its title
 * block directly underneath.
 */

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CSSProperties } from 'react';
import { PlanDrawing } from '@/components/plan/PlanDrawing';
import { RevealTitle } from '@/components/site/RevealTitle';
import { formatMm } from '@/domain/format';
import { FLAGSHIP } from '@/domain/seed/asterHouse';
import { buildPlanModel, cropForRooms } from '@/render/planModel';
import { BASELINE, headlineFor, hingeMap, solveAt } from './engine';
import css from './closing.module.css';
import s from './sections.module.css';

export function ClosingCta() {
  const frame = solveAt(FLAGSHIP.revisionBHingeMm);
  const model = buildPlanModel(frame.scene, frame.analysis, { selectedId: FLAGSHIP.doorId, hingeMaps: new Map([[FLAGSHIP.doorId, hingeMap()]]) });
  const crop = cropForRooms(model, [FLAGSHIP.roomId, FLAGSHIP.otherRoomId], { west: 700, east: 700, south: 1500, north: 500 });
  const rooms = BASELINE.rooms.length;
  const doors = BASELINE.rooms.reduce((n, r) => n + r.doors.length, 0);
  const sheets = BASELINE.documents.length;
  const plan = BASELINE.documents.find((d) => d.kind === 'drawing' && /plan/i.test(d.title));
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const say = (n: number) => words[n] ?? String(n);

  return (
    <section id="start" className={`${s.section} ${css.closing}`} aria-labelledby="start-title">
      <div className={s.container}>
        <div className={s.rule} data-rule="" />
        <div className={css.head}>
          <RevealTitle id="start-title" className={css.title} lines={['Move a door.', 'Know what it breaks.']} />
          <div className={css.side} data-reveal="" style={{ '--i': 1 } as CSSProperties}>
            <p className={s.dek}>
              The studio opens on this project: {say(rooms)} guest rooms, {say(doors)} doors and {say(sheets)} issued sheets. Try a position, compare it with the
              approved plan and record the decision. It all runs in your browser; nothing is uploaded.
            </p>
            <div className={css.actions}>
              <Link href="/demo" className={css.primary}>
                Open the studio <ArrowRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <a href="#compare" className={css.secondary}>
                Compare the three positions
              </a>
            </div>
          </div>
        </div>

        <figure className={css.sheet} data-reveal="fade" style={{ '--i': 2 } as CSSProperties}>
          <div className={css.drawing} style={{ aspectRatio: `${crop.maxX - crop.minX} / ${crop.maxY - crop.minY}` }}>
            <PlanDrawing
              model={model}
              crop={crop}
              mode="static"
              focusDoorId={FLAGSHIP.doorId}
              renderWidthPx={1340}
              title={`${plan?.id ?? 'Plan'} after Revision B`}
              description={`${FLAGSHIP.doorId} at ${formatMm(FLAGSHIP.revisionBHingeMm)}. ${headlineFor(frame)}`}
            />
          </div>
          <figcaption className={css.caption}>
            <span className={css.capId}>{plan?.id}</span>
            <span>{plan?.title}</span>
            <span className={css.capNote}>
              {FLAGSHIP.doorId} at {formatMm(FLAGSHIP.revisionBHingeMm)} · drawn from the engine, not an image
            </span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
