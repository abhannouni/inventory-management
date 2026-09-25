import { useTranslation } from 'react-i18next';
import Badge from '../../components/ui/Badge';
import type { AssignmentStatus } from '../../api/training.api';

const VARIANT = {
  not_started: 'gray',
  in_progress: 'warning',
  completed: 'success',
  missed: 'danger',
} as const;

export default function StatusBadge({ status }: { status: AssignmentStatus }) {
  const { t } = useTranslation('training');
  return <Badge variant={VARIANT[status]}>{t(`status.${status}`)}</Badge>;
}
