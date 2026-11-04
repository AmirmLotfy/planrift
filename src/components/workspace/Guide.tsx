'use client';

import { useState } from 'react';
import { analysisOf, useWorkspace } from '@/state/store';
import { useActiveView } from '@/state/hooks';
import { Button } from '@/components/ui/primitives';
import styles from './workspace.module.css';

/**
 * Judge path. Steps are marked done from real state (not from coordinates), and the "try"
 * buttons go through the same edit action as typing or dragging.
 */
export function Guide({ onOpenDecision }: { onOpenDecision: () => void }) {
  const [hidden, setHidden] = useState(false);
  const project = useWorkspace((s) => s.project);
  const viewMode = useWorkspace((s) => s.view);
  const newScenario = useWorkspace((s) => s.newScenario);
  const edit = useWorkspace((s) => s.edit);
  const setView = useWorkspace((s) => s.setView);
  const select = useWorkspace((s) => s.select);
  const view = useActiveView();
  if (hidden) return null;

  const statuses = project.scenarios.map((s) => analysisOf(s.scene).status);
  const hasScenario = project.scenarios.length > 0;
  const hasConflict = statuses.includes('CONFLICT');
  const hasPassingChange = project.scenarios.some((s, i) => statuses[i] === 'PASS' && s.past.length + s.future.length > 0);
  const decided = project.scenarios.some((s) => s.decision);

  const moveTo = (mm: number) => {
    let editable = view.editable;
    if (!editable) {
      newScenario();
      editable = true;
    }
    select('D-101');
    if (editable) edit({ kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: mm });
  };

  const steps = [
    { done: hasScenario, label: 'Start a scenario', action: !hasScenario ? <Button size="sm" onClick={() => newScenario()}>New scenario</Button> : null },
    {
      done: hasConflict,
      label: 'Move D-101 toward the console',
      action: hasScenario && !hasConflict ? <Button size="sm" onClick={() => moveTo(3000)}>Try 3,000 mm</Button> : null,
    },
    {
      done: hasPassingChange,
      label: 'Try an alternative in a new scenario',
      action:
        hasConflict && !hasPassingChange ? (
          <Button
            size="sm"
            onClick={() => {
              newScenario();
              select('D-101');
              edit({ kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2400 });
            }}
          >
            New scenario at 2,400 mm
          </Button>
        ) : null,
    },
    { done: viewMode === 'compare', label: 'Compare alternatives', action: project.scenarios.length >= 2 && viewMode !== 'compare' ? <Button size="sm" onClick={() => setView('compare')}>Compare</Button> : null },
    { done: decided, label: 'Review and decide', action: view.scenario && !decided ? <Button size="sm" onClick={onOpenDecision}>Open review</Button> : null },
  ];

  return (
    <div className={styles.guide} role="region" aria-label="Demo guide">
      <span className={styles.guideLabel}>Demo path</span>
      <ol className={styles.guideSteps}>
        {steps.map((step, i) => (
          <li key={step.label} data-done={step.done ? 'true' : 'false'}>
            <span className={styles.guideNum} aria-hidden="true">
              {step.done ? '✓' : i + 1}
            </span>
            <span>{step.label}</span>
            {step.action}
          </li>
        ))}
      </ol>
      <button type="button" className={styles.guideClose} onClick={() => setHidden(true)} aria-label="Hide demo guide">
        Hide
      </button>
    </div>
  );
}
