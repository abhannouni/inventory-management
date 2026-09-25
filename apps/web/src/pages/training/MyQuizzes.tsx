import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { trainingApi, type MyTrainingAssignment } from '../../api/training.api';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import StatusBadge from './StatusBadge';
import { ClockIcon, CalendarIcon, ListIcon, CheckCircleIcon } from './icons';

export default function MyQuizzes() {
  const { t, i18n } = useTranslation('training');
  const navigate = useNavigate();
  const [items, setItems] = useState<MyTrainingAssignment[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trainingApi.listMine().then(setItems).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <div className="card training-empty">{error}</div>;
  if (!items) return <Spinner center size="lg" />;

  if (!items.length) {
    return (
      <div className="card training-empty">
        <CheckCircleIcon size={40} />
        <strong>{t('my.emptyTitle')}</strong>
        <span>{t('my.emptyHint')}</span>
      </div>
    );
  }

  return (
    <div className="training-my-list">
      {items.map((a, i) => {
        const open = a.status === 'not_started' || a.status === 'in_progress';
        return (
          <motion.button
            key={a.id}
            type="button"
            className={`training-my-card ${open ? 'is-open' : 'is-closed'}`}
            onClick={() => open && navigate(`/training/quiz/${a.id}`)}
            disabled={!open}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
          >
            <div className="training-my-card-top">
              <h3>{a.quiz.title}</h3>
              <StatusBadge status={a.status} />
            </div>
            {a.quiz.description && <p className="training-my-card-desc">{a.quiz.description}</p>}
            <div className="training-meta">
              <span><CalendarIcon /> {t('my.deadline', { date: formatDate(a.quiz.deadline, i18n.language) })}</span>
              <span><ClockIcon /> {t('duration', { count: a.quiz.duration_minutes })}</span>
              <span><ListIcon /> {t('questionCount', { count: a.quiz.question_count })}</span>
            </div>
            {open && (
              <span className="training-my-card-cta">
                {a.status === 'in_progress' ? t('my.resume') : t('my.open')} →
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
