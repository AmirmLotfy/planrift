'use client';

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './ui.module.css';

type Variant = 'default' | 'primary' | 'accent' | 'danger' | 'quiet';

export function Button({
  variant = 'default',
  size = 'md',
  icon = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm'; icon?: boolean }) {
  const classes = [
    styles.button,
    variant !== 'default' ? styles[variant] : '',
    size === 'sm' ? styles.small : '',
    icon ? styles.icon : '',
    className ?? '',
  ].join(' ');
  return <button type="button" className={classes} {...props} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className={styles.kbd}>{children}</kbd>;
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  labelledById,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  labelledById?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const generated = useId();
  const titleId = labelledById ?? `dialog-${generated}`;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      {open ? (
        <>
          <div className={styles.dialogHeader}>
            <h2 id={titleId} className={styles.dialogTitle}>
              {title}
            </h2>
            <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close dialog">
              Close
            </Button>
          </div>
          <div className={styles.dialogBody}>{children}</div>
          {footer ? <div className={styles.dialogFooter}>{footer}</div> : null}
        </>
      ) : null}
    </dialog>
  );
}

export const fieldStyles = styles;
