'use client';

import type { ReactNode } from 'react';
import { StatusIcon } from '@/components/ui/StatusBadge';
import { useActiveView } from '@/state/hooks';
import { DecisionSection } from './DecisionSection';
import { DocumentsSection } from './DocumentsSection';
import { PositionSection } from './PositionSection';
import { ResultSection } from './ResultSection';
import { SelectionSection } from './SelectionSection';
import { Timeline } from './Timeline';
import { useFocusConsequence } from './useConsequence';
import { MOBILE_QUERY, useMediaQuery } from './useMediaQuery';
import styles from './inspector.module.css';

export type InspectorTab = 'position' | 'result' | 'documents' | 'decision';

const TABS: { id: InspectorTab; label: string }[] = [
  { id: 'position', label: 'Position' },
  { id: 'result', label: 'Result' },
  { id: 'documents', label: 'Documents' },
  { id: 'decision', label: 'Decision' },
];

/**
 * Inspector: Selection → Position → Result → Documents → Decision, separated by hairlines.
 * On phones the same sections become a bottom sheet with one tab visible at a time; the
 * switch is CSS-driven, so nothing is rendered twice and the first paint is already right.
 */
export function Inspector({
  tab,
  onTab,
  onOpenDecision,
  coach,
}: {
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  onOpenDecision: () => void;
  /** Phone-only coach row shown above the tabs. */
  coach?: ReactNode;
}) {
  const view = useActiveView();
  const { consequence } = useFocusConsequence();
  const tabbed = useMediaQuery(MOBILE_QUERY);
  const impacts = view.evaluation?.impacts.length ?? 0;

  const panel = (id: InspectorTab) => ({
    className: styles.panel,
    'data-panel': id,
    'data-active': tab === id ? 'true' : 'false',
    id: `inspector-panel-${id}`,
    role: tabbed ? 'tabpanel' : undefined,
    'aria-labelledby': tabbed ? `inspector-tab-${id}` : undefined,
  });

  return (
    <div className={styles.inspector} data-tab={tab}>
      {coach}
      <div className={styles.tabs} role="tablist" aria-label="Inspector">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`inspector-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`inspector-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            className={styles.tab}
            onClick={() => onTab(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === t.id);
              const next = e.key === 'ArrowRight' ? TABS[(i + 1) % TABS.length] : e.key === 'ArrowLeft' ? TABS[(i + TABS.length - 1) % TABS.length] : null;
              if (next) {
                e.preventDefault();
                onTab(next.id);
                document.getElementById(`inspector-tab-${next.id}`)?.focus();
              }
            }}
          >
            {t.id === 'result' && consequence ? <StatusIcon status={consequence.analysis.status} size={12} /> : null}
            <span>{t.label}</span>
            {t.id === 'documents' && impacts ? <span className={styles.tabCount}>{impacts}</span> : null}
          </button>
        ))}
      </div>
      <div className={styles.scroll}>
        <div {...panel('position')}>
          <SelectionSection />
          <PositionSection />
        </div>
        <div {...panel('result')}>
          <ResultSection />
        </div>
        <div {...panel('documents')}>
          <DocumentsSection />
        </div>
        <div {...panel('decision')}>
          <DecisionSection onOpenDecision={onOpenDecision} />
          {tabbed ? (
            <div className={styles.mobileTimeline}>
              <Timeline />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
