'use client';

import { Crosshair } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDeg, formatMeasure } from '@/domain/format';
import { useWorkspace } from '@/state/store';
import type { DoorConsequence } from './useConsequence';
import styles from './canvas.module.css';

/** The one number that matters for each status: how far it intrudes, or how close it passes. */
function keyFigure(c: DoorConsequence): { label: string; value: string } | null {
  const g = c.governing;
  if (!g || !g.separation) return null;
  const sep = g.separation.valueMm;
  switch (g.status) {
    case 'CONFLICT':
      return { label: 'intrusion', value: formatMeasure(Math.abs(sep)) };
    case 'NEAR_CLEARANCE':
      return { label: 'clearance', value: formatMeasure(sep) };
    case 'CONTACT_REVIEW':
      return { label: 'separation', value: formatMeasure(sep) };
    default:
      return null;
  }
}

/**
 * Pinned at the top of the canvas whenever the focus door is not a pass. Everything in it is
 * read from the analysis (explainPair / explainDoor); nothing is restated by hand.
 */
export function ConsequenceBanner({ consequence }: { consequence: DoorConsequence | null }) {
  const select = useWorkspace((s) => s.select);
  if (!consequence || consequence.analysis.status === 'PASS') return null;
  const { analysis, governing, headline } = consequence;
  const figure = keyFigure(consequence);
  const strikeDeg = analysis.maxOpeningDeg !== null && analysis.maxOpeningDeg < 90 ? analysis.maxOpeningDeg : null;
  const target = analysis.limitingFurnitureId ?? (governing && governing.status !== 'PASS' && governing.separation ? governing.furnitureId : null);
  const tone =
    analysis.status === 'CONFLICT' || analysis.status === 'INVALID' ? 'redline' : analysis.status === 'UNSUPPORTED' ? 'neutral' : 'amber';

  return (
    <div className={styles.banner} data-tone={tone} data-status={analysis.status} data-testid="consequence-banner">
      <StatusBadge status={analysis.status} size="sm" />
      <p className={styles.bannerText}>{headline}</p>
      {strikeDeg !== null || figure ? (
        <p className={styles.bannerFigures}>
          {strikeDeg !== null ? (
            <span>
              strike <b className="mono">{formatDeg(strikeDeg)}</b>
            </span>
          ) : null}
          {figure ? (
            <span>
              {figure.label} <b className="mono">{figure.value}</b>
            </span>
          ) : null}
        </p>
      ) : null}
      {target ? (
        <button type="button" className={styles.bannerShow} onClick={() => select(target)} aria-label={`Show ${target} on the plan`}>
          <Crosshair size={14} aria-hidden="true" />
          Show {target}
        </button>
      ) : null}
    </div>
  );
}
