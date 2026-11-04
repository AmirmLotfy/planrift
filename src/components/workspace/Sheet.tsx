'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './shell.module.css';

/**
 * Modal sheet on a native <dialog>: focus is trapped, Escape closes, focus returns to the
 * trigger. A bottom sheet on phones and a left drawer on tablets (see shell.module.css).
 */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {open ? (
        <div className={styles.sheetInner}>
          <div className={styles.sheetHead}>
            <span className={styles.sheetGrip} aria-hidden="true" />
            <h2 id={titleId} className={styles.sheetTitle}>
              {title}
            </h2>
            <button type="button" className={styles.iconButton} onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.sheetBody}>{children}</div>
        </div>
      ) : null}
    </dialog>
  );
}
