'use client';

import type { ReactNode } from 'react';
import { ArrowRight, Check, FileText, Stamp } from 'lucide-react';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import {
  BLOCKING_FOR_ACCEPTANCE,
  acceptanceBlockers,
  revisionById,
  submissionBlockers,
  type ScenarioStatus,
} from '@/domain/revision/scenario';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import styles from './inspector.module.css';

type StepState = 'done' | 'current' | 'upcoming' | 'skipped';

function stepsFor(status: ScenarioStatus): { label: string; state: StepState }[] {
  switch (status) {
    case 'draft':
      return [
        { label: 'Draft', state: 'current' },
        { label: 'In review', state: 'upcoming' },
        { label: 'Accept or reject', state: 'upcoming' },
      ];
    case 'ready_for_review':
      return [
        { label: 'Draft', state: 'done' },
        { label: 'In review', state: 'current' },
        { label: 'Accept or reject', state: 'upcoming' },
      ];
    case 'accepted':
    case 'rejected':
      return [
        { label: 'Draft', state: 'done' },
        { label: 'In review', state: 'done' },
        { label: status === 'accepted' ? 'Accepted' : 'Rejected', state: 'current' },
      ];
    case 'superseded':
      return [
        { label: 'Draft', state: 'done' },
        { label: 'In review', state: 'skipped' },
        { label: 'Superseded', state: 'current' },
      ];
  }
}

export function LifecycleStepper({ status }: { status: ScenarioStatus }) {
  const steps = stepsFor(status);
  return (
    <ol className={styles.lifecycleSteps} aria-label="Review lifecycle">
      {steps.map((step, i) => (
        <li key={step.label} data-state={step.state} aria-current={step.state === 'current' ? 'step' : undefined}>
          <span className={styles.stepDot} aria-hidden="true">
            {step.state === 'done' ? <Check size={11} strokeWidth={3} /> : i + 1}
          </span>
          <span className={styles.stepLabel}>{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

export function DecisionSection({ onOpenDecision }: { onOpenDecision: () => void }) {
  const view = useActiveView();
  const project = useWorkspace((s) => s.project);
  const activeId = useWorkspace((s) => s.activeId);
  const scenario = view.scenario;
  const evaluation = view.evaluation;

  if (!scenario || !evaluation) {
    const revision = revisionById(project, activeId) ?? project.revisions.at(-1)!;
    return (
      <section className={styles.section} aria-labelledby="decision-title">
        <h2 id="decision-title" className={styles.heading}>
          Decision
        </h2>
        <p className={styles.muted}>
          <span className="mono">{revision.id}</span> · {revision.summary}. Decisions are recorded on scenarios, each with a receipt.
        </p>
      </section>
    );
  }

  const status = evaluation.analysis.status;
  let blockers: string[] = [];
  let blockersLabel = '';
  let action: { label: string; icon: ReactNode } = { label: 'Review proposal', icon: <ArrowRight size={15} aria-hidden="true" /> };
  let ahead: string | null = null;

  if (scenario.status === 'draft') {
    blockers = submissionBlockers(evaluation);
    blockersLabel = 'Before you can submit';
    if (BLOCKING_FOR_ACCEPTANCE.includes(status) && status !== 'INVALID') {
      ahead = `Acceptance stays blocked while Revision ${scenario.label} reports ${STATUS_LABEL[status].toLowerCase()}. You can still submit it and reject it with a note.`;
    }
  } else if (scenario.status === 'ready_for_review') {
    blockers = acceptanceBlockers(evaluation, { reviewer: '', note: '', acknowledgedDocuments: false });
    blockersLabel = 'To accept';
    action = { label: 'Decide', icon: <Stamp size={15} aria-hidden="true" /> };
  } else {
    action = { label: scenario.decision ? 'View receipt' : 'View record', icon: <FileText size={15} aria-hidden="true" /> };
  }

  return (
    <section className={styles.section} aria-labelledby="decision-title" data-lifecycle={scenario.status}>
      <h2 id="decision-title" className={styles.heading}>
        Decision
      </h2>
      <LifecycleStepper status={scenario.status} />

      {scenario.decision ? (
        <dl className={styles.facts}>
          <dt>Outcome</dt>
          <dd>
            {scenario.decision.outcome === 'accepted' ? 'Accepted' : 'Rejected'}
            {scenario.decision.reviewer ? ` by ${scenario.decision.reviewer}` : ''}
          </dd>
          <dt>Decided</dt>
          <dd className="mono">{scenario.decision.decidedAt.slice(0, 16).replace('T', ' ')}</dd>
          <dt>Note</dt>
          <dd>{scenario.decision.note || '—'}</dd>
          <dt>Receipt</dt>
          <dd className="mono">{scenario.decision.receiptId}</dd>
        </dl>
      ) : scenario.status === 'superseded' ? (
        <p className={styles.muted}>Superseded when another alternative from {scenario.sourceRevisionId} was accepted.</p>
      ) : null}

      {blockers.length ? (
        <div className={styles.blockers}>
          <p className={styles.blockersLabel}>{blockersLabel}</p>
          <ul>
            {blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      ) : scenario.status === 'draft' ? (
        <p className={styles.ready}>
          <Check size={14} aria-hidden="true" /> Ready to submit for review.
        </p>
      ) : null}
      {ahead ? <p className={styles.ahead}>{ahead}</p> : null}

      <button type="button" className={styles.actionButton} onClick={onOpenDecision} data-testid="decision-action">
        {action.label}
        {action.icon}
      </button>
    </section>
  );
}
