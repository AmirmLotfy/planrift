'use client';

import { useActiveView } from '@/state/hooks';
import styles from './inspector.module.css';

/** Document impact ledger: author-mapped links flagged for human review. PLANRIFT never edits them. */
export function DocumentsSection() {
  const view = useActiveView();
  const impacts = view.evaluation?.impacts ?? [];
  const unaffected = view.scene.documents.filter((d) => !impacts.some((i) => i.documentId === d.id));

  return (
    <section className={styles.section} aria-labelledby="documents-title" data-ledger={impacts.length}>
      <div className={styles.headingRow}>
        <h2 id="documents-title" className={styles.heading}>
          Documents
        </h2>
        {impacts.length ? <span className={styles.reviewCount}>{impacts.length} to review</span> : null}
      </div>
      {view.kind === 'revision' ? (
        <p className={styles.muted}>Documents are as issued for this committed revision.</p>
      ) : impacts.length === 0 ? (
        <p className={styles.muted}>No linked drawings or schedules are affected by the current changes.</p>
      ) : (
        <>
          <ul className={styles.ledger}>
            {impacts.map((impact) => (
              <li key={impact.documentId} data-document={impact.documentId}>
                <div className={styles.ledgerHead}>
                  <span className={`mono ${styles.docChip}`}>{impact.documentId}</span>
                  <span className={styles.ledgerTitle}>{impact.title}</span>
                  <span className={`mono ${styles.ledgerRev}`}>rev {impact.revision}</span>
                </div>
                {impact.reasons.map((r) => (
                  <p key={`${r.linkId}-${r.description}`} className={styles.ledgerReason}>
                    <span className="mono">{r.description}</span> — {r.linkNote}
                  </p>
                ))}
              </li>
            ))}
          </ul>
          <p className={styles.ledgerNote}>
            PLANRIFT has not edited these documents. Review applies even when the clearance passes: revise and re-issue them through your drawing
            workflow.
          </p>
        </>
      )}
      {view.kind === 'scenario' && unaffected.length ? (
        <p className={styles.unaffected}>
          Not affected: <span className="mono">{unaffected.map((d) => d.id).join(', ')}</span>
        </p>
      ) : null}
    </section>
  );
}
