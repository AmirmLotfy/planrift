'use client';

import { useId, useState } from 'react';
import { Button, fieldStyles } from '@/components/ui/primitives';
import styles from './workspace.module.css';

/**
 * Whole-millimetre numeric input. Commits on Enter or blur; rejects anything that is not an
 * integer with a specific message and leaves the scene unchanged.
 */
export function NumberField({
  label,
  value,
  unit = 'mm',
  hint,
  disabled,
  steps,
  onCommit,
  testId,
}: {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  disabled?: boolean;
  steps?: readonly number[];
  onCommit: (value: number) => string | null;
  testId?: string;
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
    const next = Number(trimmed);
    const problem = onCommit(next);
    setError(problem);
    if (problem) setText(raw);
  };

  return (
    <div className={fieldStyles.field}>
      <label htmlFor={id} className={fieldStyles.fieldLabel}>
        {label}
      </label>
      <div className={styles.numberRow}>
        <div className={styles.numberInputWrap}>
          <input
            id={id}
            className={`${fieldStyles.input} mono`}
            inputMode="numeric"
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
          <span className={styles.unit}>{unit}</span>
        </div>
        {steps ? (
          <div className={styles.steppers}>
            {steps.map((step) => (
              <Button
                key={step}
                size="sm"
                disabled={disabled}
                onClick={() => {
                  const problem = onCommit(value + step);
                  setError(problem);
                }}
                aria-label={`${step > 0 ? 'Increase' : 'Decrease'} ${label.toLowerCase()} by ${Math.abs(step)} ${unit}`}
              >
                {step > 0 ? `+${step}` : `−${Math.abs(step)}`}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <p id={`${id}-hint`} className={fieldStyles.fieldHint}>
        {hint}
      </p>
      <p id={`${id}-error`} className={fieldStyles.fieldError} role={error ? 'alert' : undefined}>
        {error}
      </p>
    </div>
  );
}
