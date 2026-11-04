import { Fragment, type CSSProperties, type ReactNode } from 'react';

/**
 * Heading whose lines rise into place when scrolled into view (LandingMotion adds `is-in` to
 * `[data-lines]`). Without JS or with reduced motion the text is simply visible.
 */
export function RevealTitle({
  id,
  lines,
  className,
  as: Tag = 'h2',
}: {
  id?: string;
  lines: readonly ReactNode[];
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'p';
}) {
  return (
    <Tag id={id} className={className} data-lines="">
      {lines.map((line, j) => (
        <Fragment key={j}>
          {/* The space keeps the accessible name readable; it collapses between block lines. */}
          {j > 0 ? ' ' : null}
          <span data-line="" style={{ '--j': j } as CSSProperties}>
            <span>{line}</span>
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
