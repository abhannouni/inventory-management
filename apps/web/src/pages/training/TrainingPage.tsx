import { useTranslation } from 'react-i18next';
import PageHeader from '../../components/ui/PageHeader';
import { usePermissions } from '../../hooks/usePermissions';
import QuizManager from './QuizManager';
import MyQuizzes from './MyQuizzes';
import './training.css';

/**
 * One page, two audiences: whoever holds `training.manage` (Super Admin)
 * builds, assigns and follows quizzes; everyone else sees the quizzes
 * assigned to them.
 */
export default function TrainingPage() {
  const { t } = useTranslation('training');
  const { can } = usePermissions();

  if (can('training.manage')) return <QuizManager />;

  return (
    <div>
      <PageHeader title={t('title')} subtitle={t('my.subtitle')} />
      <MyQuizzes />
    </div>
  );
}
