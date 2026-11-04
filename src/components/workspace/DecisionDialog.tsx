'use client';

import { useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button, Dialog } from '@/components/ui/primitives';
import { shortFingerprint } from '@/domain/io/canonical';
import { receiptHtml } from '@/domain/io/receiptHtml';
import { describeFieldChange } from '@/domain/revision/diff';
import { acceptanceBlockers, submissionBlockers } from '@/domain/revision/scenario';
import { useActiveView } from '@/state/hooks';
import { useWorkspace } from '@/state/store';
import { LifecycleStepper } from './DecisionSection';
import { downloadText } from './download';
import styles from './dialogs.module.css';

function Blockers({ reasons, label }: { reasons: readonly string[]; label: string }) {
  if (!reasons.length) return null;
  return (
    <div className={styles.blockers} aria-label="Blocking conditions" role="group">
      <p className={styles.blockersLabel}>
        <TriangleAlert size={14} aria-hidden="true" /> {label}
      </p>
      <ul>
        {reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

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
  if (!scenario || !evaluation) {
    return (
      <Dialog open={false} title="Review" onClose={onClose}>
        {null}
      </Dialog>
    );
  }

  const input = { reviewer, note, acknowledgedDocuments: ack };
  const receipt = scenario.decision ? project.receipts.find((r) => r.id === scenario.decision!.receiptId) : undefined;
  const status = evaluation.analysis.status;

  let body: ReactNode;
  let footer: ReactNode;

  const summary = (
    <div className={styles.summary}>
      <div className={styles.summaryHead}>
        <div>
          <p className={styles.summaryLabel}>
            Revision {scenario.label} <span className="mono">· from {scenario.sourceRevisionId}</span>
          </p>
          <p className={styles.summaryName}>{scenario.name}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <LifecycleStepper status={scenario.status} />
      <dl className={styles.rows}>
        <dt>Changes</dt>
        <dd>
          {evaluation.diff.fields.length ? (
            <ul className={styles.plain}>
              {evaluation.diff.fields.map((c) => (
                <li key={c.field + c.elementId} className="mono">
                  {describeFieldChange(c)}
                </li>
              ))}
            </ul>
          ) : (
            <span className={styles.muted}>No changes yet.</span>
          )}
        </dd>
        <dt>Documents</dt>
        <dd>
          {evaluation.impacts.length ? (
            <span className={styles.docLine}>
              {evaluation.impacts.map((i) => (
                <span key={i.documentId} className={`mono ${styles.docChip}`}>
                  {i.documentId}
                </span>
              ))}
              <span>require review.</span>
            </span>
          ) : (
            <span className={styles.muted}>No linked documents affected.</span>
          )}
        </dd>
      </dl>
    </div>
  );

  if (scenario.status === 'draft') {
    const reasons = submissionBlockers(evaluation);
    body = (
      <>
        {summary}
        <div className={styles.field}>
          <label htmlFor="remarks" className={styles.label}>
            Remarks for the reviewer
          </label>
          <textarea
            id="remarks"
            className={styles.input}
            rows={3}
            defaultValue={scenario.remarks}
            onBlur={(e) => setRemarks(e.target.value)}
            maxLength={2000}
          />
        </div>
        <Blockers reasons={reasons} label="Before you can submit" />
      </>
    );
    footer = (
      <>
        <Button variant="danger" onClick={() => discard()} disabled={!evaluation.hasChanges}>
          Discard changes
        </Button>
        <span className={styles.spacer} />
        <Button variant="accent" disabled={reasons.length > 0} onClick={() => submit()}>
          Submit for review
        </Button>
      </>
    );
  } else if (scenario.status === 'ready_for_review') {
    const reasons = acceptanceBlockers(evaluation, input);
    body = (
      <>
        {summary}
        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="reviewer" className={styles.label}>
              Reviewer <span className={styles.optional}>optional</span>
            </label>
            <input id="reviewer" className={styles.input} value={reviewer} maxLength={80} onChange={(e) => setReviewer(e.target.value)} />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="note" className={styles.label}>
            Decision note
          </label>
          <textarea id="note" className={styles.input} rows={3} value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} aria-describedby="note-hint" />
          <p id="note-hint" className={styles.hint}>
            Required to reject, and to accept a contact or near-clearance advisory.
          </p>
        </div>
        {evaluation.impacts.length ? (
          <label className={styles.ack}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>
              I understand PLANRIFT has not modified{' '}
              <span className="mono">{evaluation.impacts.map((i) => i.documentId).join(', ')}</span>; they must be revised and re-issued by the
              design team.
            </span>
          </label>
        ) : null}
        <Blockers reasons={reasons} label="To accept" />
      </>
    );
    footer = (
      <>
        <Button onClick={() => reopen()}>Return to draft</Button>
        <span className={styles.spacer} />
        <Button variant="danger" disabled={note.trim().length < 3} onClick={() => reject({ reviewer, note })}>
          Reject
        </Button>
        <Button variant="accent" disabled={reasons.length > 0} onClick={() => accept(input)}>
          Accept &amp; commit
        </Button>
      </>
    );
  } else if (receipt) {
    body = (
      <article className={styles.receipt} data-receipt={receipt.id}>
        <header className={styles.receiptHead}>
          <div>
            <p className={styles.summaryLabel}>Revision receipt</p>
            <p className={`mono ${styles.receiptId}`}>{receipt.id}</p>
          </div>
          <span className={styles.outcome} data-outcome={receipt.decision.outcome}>
            {receipt.decision.outcome === 'accepted' ? 'Accepted' : 'Rejected'}
          </span>
        </header>
        <dl className={styles.rows}>
          <dt>Decided</dt>
          <dd>
            <span className="mono">{receipt.decision.decidedAt.slice(0, 16).replace('T', ' ')}</span>
            {receipt.decision.reviewer ? ` by ${receipt.decision.reviewer}` : ''}
          </dd>
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
        <p className={styles.disclaimer}>A review record, not a construction certificate or compliance statement.</p>
      </article>
    );
    footer = (
      <>
        <Button onClick={() => downloadText(`${receipt.id}.json`, JSON.stringify(receipt, null, 2), 'application/json')}>Receipt .json</Button>
        <span className={styles.spacer} />
        <Button variant="accent" onClick={() => downloadText(`${receipt.id}.html`, receiptHtml(receipt), 'text/html')}>
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
    <Dialog
      open={open}
      title={scenario.status === 'draft' ? 'Review proposal' : scenario.status === 'ready_for_review' ? 'Decide' : 'Decision record'}
      onClose={onClose}
      footer={<div className={styles.footer}>{footer}</div>}
    >
      <div className={styles.body} data-dialog="decision">
        {body}
      </div>
    </Dialog>
  );
}
