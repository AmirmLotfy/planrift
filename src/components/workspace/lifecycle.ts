import type { ScenarioStatus } from '@/domain/revision/scenario';

/** Lifecycle wording shared by the top bar, the decision section and the comparison sheet. */
export const LIFECYCLE_LABEL: Record<ScenarioStatus | 'committed', string> = {
  committed: 'Committed',
  draft: 'Draft',
  ready_for_review: 'In review',
  accepted: 'Accepted',
  rejected: 'Rejected',
  superseded: 'Superseded',
};

/** Label of the single primary action, which follows the lifecycle: Review → Decide → Receipt. */
export function primaryActionLabel(status: ScenarioStatus): string {
  switch (status) {
    case 'draft':
      return 'Review';
    case 'ready_for_review':
      return 'Decide';
    case 'accepted':
    case 'rejected':
      return 'Receipt';
    case 'superseded':
      return 'Record';
  }
}
