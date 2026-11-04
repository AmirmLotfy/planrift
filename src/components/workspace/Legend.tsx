import { StatusIcon } from '@/components/ui/StatusBadge';
import type { StatusKey } from '@/render/palette';
import styles from './canvas.module.css';

const ITEMS: { status: StatusKey; label: string }[] = [
  { status: 'PASS', label: 'Pass' },
  { status: 'NEAR_CLEARANCE', label: 'Near' },
  { status: 'CONTACT_REVIEW', label: 'Contact' },
  { status: 'CONFLICT', label: 'Conflict' },
  { status: 'INVALID', label: 'Invalid' },
  { status: 'REVIEW_REQUIRED', label: 'Review' },
];

/** Status key for the plan, with the same shapes as the status tags. */
export function Legend() {
  return (
    <ul className={styles.legend} aria-label="Status key">
      {ITEMS.map((item) => (
        <li key={item.status}>
          <StatusIcon status={item.status} size={12} />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
