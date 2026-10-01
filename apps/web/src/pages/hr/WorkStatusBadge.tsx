import { useTranslation } from 'react-i18next';
import type { WorkStatus } from '../../api/hr.api';
import { STATUS_TONE } from './hrUtils';

interface Props {
  status: WorkStatus;
  /** Replace the label (e.g. "Working now" instead of "In progress"). */
  label?: string;
  size?: 'sm' | 'md';
}

/**
 * The colour-coded working-hours status, used identically on the dashboard,
 * the tracking table and the employee view. The tooltip spells out the rule.
 */
export default function WorkStatusBadge({ status, label, size = 'md' }: Props) {
  const { t } = useTranslation('hr');
  return (
    <span
      className={`wh-status wh-tone-${STATUS_TONE[status]} ${size === 'sm' ? 'is-sm' : ''}`}
      title={t(`status.${status}.hint`)}
    >
      <span className="wh-status-dot" aria-hidden="true" />
      {label ?? t(`status.${status}.label`)}
    </span>
  );
}
