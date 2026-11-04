/**
 * PLANRIFT mark: the architectural plan symbol for a door (wall break, open leaf, swing arc)
 * with a redline block cutting into the swing — the product's whole idea in one glyph.
 */
export function LogoMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} style={{ flex: 'none' }}>
      {title ? <title>{title}</title> : null}
      {/* Room outline with the door opening in the south wall. */}
      <path d="M7 21.5H2.5V2.5h19v19H17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
      {/* Open leaf and its quarter swing. */}
      <path d="M7 21.5V11.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
      <path d="M17 21.5A10 10 0 0 0 7 11.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      {/* The redline block cutting into the swing. */}
      <rect x="12.6" y="12.9" width="5.4" height="4.2" style={{ fill: 'var(--redline)' }} />
    </svg>
  );
}

export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: Math.round(size * 0.42) }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 650, letterSpacing: '0.075em', fontSize: Math.round(size * 0.64), lineHeight: 1 }}>PLANRIFT</span>
    </span>
  );
}
