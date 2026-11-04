'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useActiveView } from '@/state/hooks';
import { analysisOf, useWorkspace } from '@/state/store';
import { updateCoachPrefs, useCoachPrefs } from './coachState';
import styles from './canvas.module.css';

export interface CoachStep {
  readonly title: string;
  readonly body: string;
  readonly done: boolean;
  readonly action: { label: string; run: () => void } | null;
}

export interface CoachModel {
  readonly visible: boolean;
  readonly index: number;
  readonly steps: readonly CoachStep[];
}

/**
 * First-run coach. Steps are marked done from real project state (never from coordinates), and
 * every action goes through the same store actions as the controls in the studio.
 */
export function useCoach(onOpenDecision: () => void): CoachModel {
  const project = useWorkspace((s) => s.project);
  const viewMode = useWorkspace((s) => s.view);
  const newScenario = useWorkspace((s) => s.newScenario);
  const edit = useWorkspace((s) => s.edit);
  const setView = useWorkspace((s) => s.setView);
  const select = useWorkspace((s) => s.select);
  const prefs = useCoachPrefs();
  const view = useActiveView();

  // The store only knows the current view; remember that the comparison was opened once.
  useEffect(() => {
    if (viewMode === 'compare') updateCoachPrefs({ compared: true });
  }, [viewMode]);

  const statuses = project.scenarios.map((s) => analysisOf(s.scene).status);
  const hasScenario = project.scenarios.length > 0;
  const hasConflict = statuses.includes('CONFLICT');
  const hasPassingChange = project.scenarios.some((s, i) => statuses[i] === 'PASS' && s.past.length + s.future.length > 0);
  const compared = prefs.compared || viewMode === 'compare';
  const decided = project.scenarios.some((s) => s.decision);

  const moveTo = (mm: number) => {
    if (!view.editable) newScenario();
    select('D-101');
    edit({ kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: mm });
  };

  const steps: CoachStep[] = [
    {
      title: 'Start a scenario',
      body: 'A scenario branches from the committed revision, so the baseline stays untouched.',
      done: hasScenario,
      action: { label: 'Start a scenario', run: () => newScenario() },
    },
    {
      title: 'Move D-101 toward the console',
      body: 'Drag the blue hinge on the plan, use the slider, or type a value.',
      done: hasConflict,
      action: { label: 'Try 3,000 mm', run: () => moveTo(3000) },
    },
    {
      title: 'Try an alternative',
      body: 'A second scenario keeps the first one for comparison.',
      done: hasPassingChange,
      action: {
        label: 'New scenario at 2,400 mm',
        run: () => {
          newScenario();
          select('D-101');
          edit({ kind: 'door.hinge', doorId: 'D-101', hingeOffsetMm: 2400 });
        },
      },
    },
    {
      title: 'Compare the alternatives',
      body: 'Status, clearance and documents for each alternative, side by side.',
      done: compared,
      action: hasScenario ? { label: 'Open the comparison', run: () => setView('compare') } : null,
    },
    {
      title: 'Review and decide',
      body: 'Submit, then accept or reject with a note. Every decision gets a receipt.',
      done: decided,
      action: view.scenario ? { label: 'Open review', run: onOpenDecision } : null,
    },
  ];
  const index = steps.findIndex((s) => !s.done);
  return { visible: !prefs.dismissed && index !== -1 && viewMode !== 'compare', index, steps };
}

/** Small dismissible card: one next step with its real action. */
export function CoachCard({ coach, variant = 'card' }: { coach: CoachModel; variant?: 'card' | 'row' }) {
  const step = coach.steps[coach.index];
  if (!coach.visible || !step) return null;
  return (
    <aside className={styles.coach} data-variant={variant} aria-label="Getting started" data-testid="coach">
      <div className={styles.coachHead}>
        <span className={styles.coachProgress}>
          {coach.steps.map((s, i) => (
            <span key={s.title} className={styles.coachPip} data-state={s.done ? 'done' : i === coach.index ? 'current' : 'todo'} aria-hidden="true" />
          ))}
          <span className={styles.coachCount}>
            <span className="visually-hidden">Step </span>
            {coach.index + 1}
            <span aria-hidden="true">/</span>
            <span className="visually-hidden"> of </span>
            {coach.steps.length}
          </span>
        </span>
        <p className={styles.coachTitle}>{step.title}</p>
        <button type="button" className={styles.coachClose} onClick={() => updateCoachPrefs({ dismissed: true })} aria-label="Hide the getting-started tips">
          <X size={14} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.coachBody}>{step.body}</p>
      {step.action ? (
        <button type="button" className={styles.coachAction} onClick={step.action.run}>
          {step.action.label}
        </button>
      ) : null}
    </aside>
  );
}
