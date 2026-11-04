import { statusText, type StatusKey } from '@/render/palette';
import { STATUS_LABEL } from '@/domain/analysis/explain';
import styles from './ui.module.css';

/** Status = colour + icon shape + text label (never colour alone). */
export function StatusIcon({ status, size = 14, inherit = false }: { status: StatusKey; size?: number; inherit?: boolean }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    'aria-hidden': true,
    focusable: false,
    style: inherit ? undefined : { color: statusText[status], flex: 'none' },
  } as const;
  switch (status) {
    case 'PASS':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.6 8.3l2.2 2.2 4.6-4.8" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'CONFLICT':
      return (
        <svg {...common}>
          <path d="M8 1.2l7 12.6H1z" fill="currentColor" />
          <path d="M8 5.6v4M8 11.6v.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'NEAR_CLEARANCE':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />
          <circle cx="8" cy="8" r="2.2" fill="currentColor" />
        </svg>
      );
    case 'CONTACT_REVIEW':
      return (
        <svg {...common}>
          <circle cx="5.6" cy="8" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="11.6" cy="8" r="3.6" fill="currentColor" />
        </svg>
      );
    case 'INVALID':
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="currentColor" />
          <path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'UNSUPPORTED':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6.2 6.2a1.9 1.9 0 113 1.6c-.7.4-1.2.8-1.2 1.6M8 11.6v.3" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case 'REVIEW_REQUIRED':
      return (
        <svg {...common}>
          <path d="M3 1.5h7l3 3v10H3z" fill="currentColor" />
          <path d="M5.5 8h5M5.5 10.8h3.2" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StatusBadge({ status, size = 'md', label }: { status: StatusKey; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  return (
    <span className={`${styles.badge} ${styles[`badge-${size}`]}`} data-status={status}>
      <StatusIcon status={status} size={size === 'lg' ? 18 : size === 'sm' ? 12 : 14} inherit />
      <span>{label ?? STATUS_LABEL[status]}</span>
    </span>
  );
}
