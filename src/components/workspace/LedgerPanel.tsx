'use client';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { useActiveView } from '@/state/hooks';
import styles from './workspace.module.css';

export function LedgerPanel() {
  const view = useActiveView();
  const impacts = view.evaluation?.impacts ?? [];
  return (
    <section className={styles.panel} aria-labelledby="ledger-title" data-ledger={impacts.length}>
      <div className={styles.panelHead}>
        <div>
          <p className={styles.eyebrow}>Document impact ledger</p>
          <h2 id="ledger-title" className={styles.panelTitle}>
            Linked drawings &amp; schedules
          </h2>
        </div>
        {impacts.length ? <StatusBadge status="REVIEW_REQUIRED" label={`${impacts.length} to review`} /> : null}
      </div>
      {view.kind === 'revision' ? (
        <p className={styles.muted}>Documents are as issued for this committed revision.</p>
      ) : impacts.length === 0 ? (
        <p className={styles.muted}>No linked documents are affected by the current changes.</p>
      ) : (
        <>
          <ul className={styles.ledger}>
            {impacts.map((impact) => (
              <li key={impact.documentId} data-document={impact.documentId}>
                <div className={styles.ledgerHead}>
                  <span className={`mono ${styles.docId}`}>{impact.documentId}</span>
                  <span className={styles.ledgerTitle}>{impact.title}</span>
                  <StatusBadge status="REVIEW_REQUIRED" size="sm" />
                </div>
                <ul className={styles.ledgerReasons}>
                  {impact.reasons.map((r) => (
                    <li key={`${r.linkId}-${r.description}`}>
                      <span className="mono">{r.description}</span>
                      <span className={styles.muted}> — {r.linkNote}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles.ledgerMeta}>Issued revision {impact.revision}</p>
              </li>
            ))}
          </ul>
          <p className={styles.ledgerNote}>
            PLANRIFT has not modified these documents. Review still applies when the clearance passes: revise and re-issue them through your
            drawing workflow.
          </p>
        </>
      )}
    </section>
  );
}
