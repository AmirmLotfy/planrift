'use client';

import { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button, Dialog, fieldStyles } from '@/components/ui/primitives';
import { shortFingerprint } from '@/domain/io/canonical';
import { receiptHtml } from '@/domain/io/receiptHtml';
import { describeFieldChange } from '@/domain/revision/diff';
import { acceptanceBlockers, submissionBlockers } from '@/domain/revision/scenario';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { downloadText } from './download';
import styles from './workspace.module.css';

export function DecisionDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const view = useActiveView();
  const project = useWorkspace((s) => s.project);
  const submit = useWorkspace((s) => s.submit);
  const reopen = useWorkspace((s) => s.reopen);
  const accept = useWorkspace((s) => s.accept);
  const reject = useWorkspace((s) => s.reject);
  const discard = useWorkspace((s) => s.discard);
  const setRemarks = useWorkspace((s) => s.setRemarks);
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const scenario = view.scenario;
  const evaluation = view.evaluation;
  if (!scenario || !evaluation) return <Dialog open={false} title="Review" onClose={onClose}>{null}</Dialog>;

  const input = { reviewer, note, acknowledgedDocuments: ack };
  const receipt = scenario.decision ? project.receipts.find((r) => r.id === scenario.decision!.receiptId) : undefined;
  const status = evaluation.analysis.status;

  let body: React.ReactNode;
  let footer: React.ReactNode;

  const summary = (
    <div className={styles.decisionSummary}>
      <div className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>Revision {scenario.label}</p>
          <p className={styles.panelTitle}>{scenario.name}</p>
        </div>
        <StatusBadge status={status} size="lg" />
      </div>
      <ul className={styles.plainList}>
        {evaluation.diff.fields.length ? evaluation.diff.fields.map((c) => <li key={c.field + c.elementId} className="mono">{describeFieldChange(c)}</li>) : <li>No changes yet.</li>}
      </ul>
      {evaluation.impacts.length ? (
        <p>
          <StatusBadge status="REVIEW_REQUIRED" size="sm" label={`${evaluation.impacts.length} documents`} />{' '}
          <span className="mono">{evaluation.impacts.map((i) => i.documentId).join(', ')}</span> require review.
        </p>
      ) : null}
    </div>
  );

  const blockers = (reasons: string[]) =>
    reasons.length ? (
      <ul className={styles.blockers} aria-label="Blocking conditions">
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    ) : null;

  if (scenario.status === 'draft') {
    const reasons = submissionBlockers(evaluation);
    body = (
      <>
        {summary}
        <div className={fieldStyles.field}>
          <label htmlFor="remarks" className={fieldStyles.fieldLabel}>
            Remarks for the reviewer
          </label>
          <textarea id="remarks" className={fieldStyles.input} rows={3} defaultValue={scenario.remarks} onBlur={(e) => setRemarks(e.target.value)} maxLength={2000} />
        </div>
        {blockers(reasons)}
      </>
    );
    footer = (
      <>
        <Button variant="danger" onClick={() => discard()} disabled={!evaluation.hasChanges}>
          Discard changes
        </Button>
        <Button variant="primary" disabled={reasons.length > 0} onClick={() => submit()}>
          Submit for review
        </Button>
      </>
    );
  } else if (scenario.status === 'ready_for_review') {
    const reasons = acceptanceBlockers(evaluation, input);
    body = (
      <>
        {summary}
        <div className={fieldStyles.field}>
          <label htmlFor="reviewer" className={fieldStyles.fieldLabel}>
            Reviewer (optional)
          </label>
          <input id="reviewer" className={fieldStyles.input} value={reviewer} maxLength={80} onChange={(e) => setReviewer(e.target.value)} />
        </div>
        <div className={fieldStyles.field}>
          <label htmlFor="note" className={fieldStyles.fieldLabel}>
            Decision note
          </label>
          <textarea id="note" className={fieldStyles.input} rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} />
          <p className={fieldStyles.fieldHint}>Required to reject, and to accept a contact or near-clearance advisory.</p>
        </div>
        {evaluation.impacts.length ? (
          <label className={styles.ack}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>
              I understand PLANRIFT has not modified {evaluation.impacts.map((i) => i.documentId).join(', ')}; they must be revised and re-issued by
              the design team.
            </span>
          </label>
        ) : null}
        {blockers(reasons)}
      </>
    );
    footer = (
      <>
        <Button onClick={() => reopen()}>Return to draft</Button>
        <Button variant="danger" disabled={note.trim().length < 3} onClick={() => reject({ reviewer, note })}>
          Reject
        </Button>
        <Button variant="primary" disabled={reasons.length > 0} onClick={() => accept(input)}>
          Accept &amp; commit
        </Button>
      </>
    );
  } else if (receipt) {
    body = (
      <>
        <div className={styles.receiptCard} data-receipt={receipt.id}>
          <p className={styles.eyebrow}>Revision receipt</p>
          <p className={`mono ${styles.receiptId}`}>{receipt.id}</p>
          <p>
            <strong>{receipt.decision.outcome === 'accepted' ? 'Accepted' : 'Rejected'}</strong>
            {receipt.decision.reviewer ? ` by ${receipt.decision.reviewer}` : ''} · <span className="mono">{receipt.decision.decidedAt.slice(0, 16).replace('T', ' ')}</span>
          </p>
          <dl className={styles.facts}>
            <dt>Source</dt>
            <dd className="mono">
              {receipt.source.revisionId} · {shortFingerprint(receipt.source.fingerprint)}
            </dd>
            <dt>Result</dt>
            <dd className="mono">
              {receipt.result.revisionId ?? 'not committed'} · {shortFingerprint(receipt.result.fingerprint)}
            </dd>
            <dt>Analysis</dt>
            <dd>
              <StatusBadge status={receipt.analysis.status} size="sm" />
            </dd>
            <dt>Documents</dt>
            <dd className="mono">{receipt.impacts.map((i) => i.documentId).join(', ') || '—'}</dd>
            <dt>Note</dt>
            <dd>{receipt.decision.note || '—'}</dd>
          </dl>
          <p className={styles.muted}>A review record, not a construction certificate or compliance statement.</p>
        </div>
      </>
    );
    footer = (
      <>
        <Button onClick={() => downloadText(`${receipt.id}.json`, JSON.stringify(receipt, null, 2), 'application/json')}>Receipt .json</Button>
        <Button variant="primary" onClick={() => downloadText(`${receipt.id}.html`, receiptHtml(receipt), 'text/html')}>
          Printable receipt .html
        </Button>
      </>
    );
  } else {
    body = (
      <>
        {summary}
        <p className={styles.muted}>This scenario was superseded when another alternative from the same source was accepted.</p>
      </>
    );
    footer = <Button onClick={onClose}>Close</Button>;
  }

  return (
    <Dialog open={open} title={scenario.status === 'draft' ? 'Review proposal' : scenario.status === 'ready_for_review' ? 'Decide' : 'Decision record'} onClose={onClose} footer={footer}>
      {body}
    </Dialog>
  );
}
