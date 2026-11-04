/**
 * PLANRIFT mark: the architectural plan symbol for a door (wall break, open leaf, swing arc)
 * with a furniture block cutting into the swing — the product's whole idea in one glyph.
 */
export function LogoMark({ size = 24, title }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <path d="M7 21.5H2.5V2.5h19v19H17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" />
      <path d="M7 21.5V11.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square" />
      <path d="M17 21.5A10 10 0 0 0 7 11.5" fill="none" stroke="currentColor" strokeWidth="1.25" />
      <rect x="12.6" y="12.9" width="5.4" height="4.2" fill="#FF3B1F" />
    </svg>
  );
}

export function Logo({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 800, fontStretch: '118%', letterSpacing: '0.02em', fontSize: size * 0.68 }}>PLANRIFT</span>
    </span>
  );
}
