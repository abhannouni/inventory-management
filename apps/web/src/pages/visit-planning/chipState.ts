import type { VisitPlanStatus, VisitStatus } from '../../types';

/**
 * Which colour a planned visit wears on the calendar.
 *
 * A visit that has actually started speaks for itself — `open` while the clock
 * runs, `completed` once it is closed. One still sitting on the calendar borrows
 * the month's review state instead, so a whole month turns green the moment it
 * is approved and amber again if an edit sends it back for validation.
 */
export function chipState(
  visit: { status: VisitStatus },
  planStatus: VisitPlanStatus | null | undefined,
): string {
  if (visit.status !== 'planned') return visit.status;
  switch (planStatus) {
    case 'approved': return 'approved';
    case 'declined': return 'declined';
    case 'pending_review': return 'pending';
    default: return 'draft';
  }
}
