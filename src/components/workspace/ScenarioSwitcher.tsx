'use client';

import { Plus } from 'lucide-react';
import { StatusIcon } from '@/components/ui/StatusBadge';
import { headRevision } from '@/domain/revision/scenario';
import { analysisOf, useWorkspace } from '@/state/store';
import { LIFECYCLE_LABEL } from './lifecycle';
import styles from './shell.module.css';

export const NEW_SCENARIO_LABEL = 'New scenario from the committed revision';

function useSwitcherEntries() {
  const project = useWorkspace((s) => s.project);
  const head = headRevision(project);
  return [
    {
      id: head.id,
      label: head.id === 'REV-0' ? 'Baseline' : head.label,
      meta: head.id,
      status: analysisOf(head.scene).status,
      lifecycle: 'committed' as const,
    },
    ...project.scenarios.map((s) => ({
      id: s.id,
      label: `Revision ${s.label}`,
      meta: s.name !== `Revision ${s.label}` ? s.name : '',
      status: analysisOf(s.scene).status,
      lifecycle: s.status,
    })),
  ];
}

/** Segmented control over the committed revision and its scenarios (desktop and tablet). */
export function ScenarioSwitcher() {
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const newScenario = useWorkspace((s) => s.newScenario);
  const entries = useSwitcherEntries();

  return (
    <nav className={styles.switcher} aria-label="Revisions and scenarios">
      <div className={styles.segments}>
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={styles.segment}
            aria-current={activeId === entry.id ? 'page' : undefined}
            data-lifecycle={entry.lifecycle}
            title={`${entry.label}${entry.meta ? ` · ${entry.meta}` : ''} — ${LIFECYCLE_LABEL[entry.lifecycle]}`}
            onClick={() => setActive(entry.id)}
          >
            <StatusIcon status={entry.status} size={12} />
            <span className={styles.segmentLabel}>{entry.label}</span>
            {entry.lifecycle === 'committed' ? <span className={styles.segmentMeta}>{entry.meta}</span> : null}
          </button>
        ))}
      </div>
      <button type="button" className={styles.newButton} onClick={() => newScenario()} aria-label={NEW_SCENARIO_LABEL} title={NEW_SCENARIO_LABEL}>
        <Plus size={14} aria-hidden="true" />
        <span>New</span>
      </button>
    </nav>
  );
}

/** Compact scenario picker for narrow screens: a native select plus the new-scenario button. */
export function ScenarioSelect() {
  const activeId = useWorkspace((s) => s.activeId);
  const setActive = useWorkspace((s) => s.setActive);
  const newScenario = useWorkspace((s) => s.newScenario);
  const entries = useSwitcherEntries();
  const active = entries.find((e) => e.id === activeId) ?? entries[0]!;

  return (
    <div className={styles.scenarioSelect}>
      <label className={styles.selectWrap}>
        <span className="visually-hidden">Scenario</span>
        <StatusIcon status={active.status} size={12} />
        <select value={activeId} onChange={(e) => setActive(e.target.value)} className={styles.select}>
          {entries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label} — {LIFECYCLE_LABEL[entry.lifecycle]}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className={styles.iconButton} onClick={() => newScenario()} aria-label={NEW_SCENARIO_LABEL} title={NEW_SCENARIO_LABEL}>
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
