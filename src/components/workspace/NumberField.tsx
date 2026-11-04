'use client';

import { useId, useState, type ReactNode } from 'react';
import styles from './inspector.module.css';

/**
 * Whole-millimetre numeric input. Commits on Enter or blur; rejects anything that is not an
 * integer with a specific message and leaves the scene unchanged. Escape restores the value.
 */
export function NumberField({
  label,
  value,
  unit = 'mm',
  hint,
  aside,
  disabled,
  onCommit,
  testId,
  size = 'md',
  children,
}: {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  /** Short text shown at the right of the label row. */
  aside?: ReactNode;
  disabled?: boolean;
  onCommit: (value: number) => string | null;
  testId?: string;
  size?: 'md' | 'lg';
  /** Extra controls bound to the same value (slider, steppers), placed between input and hint. */
  children?: ReactNode;
}) {
  const id = useId();
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(value);
  // Adjust state while rendering when the committed value changes (undo, drag, other inputs).
  if (synced !== value) {
    setSynced(value);
    setText(String(value));
    setError(null);
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim().replace(/[\s,_]/g, '');
    if (trimmed === String(value)) {
      setError(null);
      return;
    }
    if (!/^-?\d+$/.test(trimmed)) {
      setError(trimmed === '' ? 'Enter a value in whole millimetres.' : `“${raw.trim()}” is not a whole number of millimetres.`);
      return;
    }
    const problem = onCommit(Number(trimmed));
    setError(problem);
    if (problem) setText(raw);
  };

  return (
    <div className={styles.field} data-size={size}>
      <div className={styles.fieldHead}>
        <label htmlFor={id} className={styles.fieldLabel}>
          {label}
        </label>
        {aside ? <span className={styles.fieldAside}>{aside}</span> : null}
      </div>
      <div className={styles.inputWrap}>
        <input
          id={id}
          className={`${styles.input} mono`}
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          value={text}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={`${id}-hint ${id}-error`}
          data-testid={testId}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') {
              setText(String(value));
              setError(null);
            }
          }}
        />
        <span className={styles.unit} aria-hidden="true">
          {unit}
        </span>
      </div>
      {children}
      <p id={`${id}-hint`} className={styles.fieldHint}>
        {hint}
      </p>
      <p id={`${id}-error`} className={styles.fieldError} role={error ? 'alert' : undefined}>
        {error}
      </p>
    </div>
  );
}
