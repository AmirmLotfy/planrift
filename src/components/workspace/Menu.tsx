'use client';

import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import styles from './shell.module.css';

export interface MenuEntry {
  readonly key: string;
  readonly label: ReactNode;
  /** Secondary text at the right, e.g. a file extension or a shortcut. */
  readonly hint?: string;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  /** Renders as a checkable item (aria-checked). */
  readonly checked?: boolean;
  readonly separatorBefore?: boolean;
  readonly onSelect: () => void;
}

/**
 * Menu button following the WAI-ARIA menu pattern: arrow keys move between items, Escape
 * closes and returns focus to the trigger, a click outside closes.
 */
export function Menu({
  label,
  ariaLabel,
  items,
  triggerClassName,
  align = 'end',
  testId,
}: {
  label: ReactNode;
  ariaLabel?: string;
  items: readonly MenuEntry[];
  triggerClassName?: string;
  align?: 'start' | 'end';
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)')?.focus();
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]:not(:disabled)') ?? [])];
    const index = entries.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (i: number) => entries[(i + entries.length) % entries.length]?.focus();
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusAt(index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusAt(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusAt(0);
        break;
      case 'End':
        event.preventDefault();
        focusAt(entries.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  return (
    <div className={styles.menu} ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        id={`${id}-trigger`}
        className={triggerClassName}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${id}-menu` : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {label}
      </button>
      {open ? (
        <div
          ref={listRef}
          id={`${id}-menu`}
          role="menu"
          aria-labelledby={`${id}-trigger`}
          className={styles.menuList}
          data-align={align}
          onKeyDown={onListKeyDown}
        >
          {items.map((item) => (
            <Fragment key={item.key}>
              {item.separatorBefore ? <div role="separator" className={styles.menuSeparator} /> : null}
              <button
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked}
                tabIndex={-1}
                className={styles.menuItem}
                disabled={item.disabled}
                onClick={() => {
                  close(true);
                  item.onSelect();
                }}
              >
                {item.icon ? <span className={styles.menuIcon}>{item.icon}</span> : null}
                <span className={styles.menuLabel}>{item.label}</span>
                {item.hint ? <span className={styles.menuHint}>{item.hint}</span> : null}
              </button>
            </Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
