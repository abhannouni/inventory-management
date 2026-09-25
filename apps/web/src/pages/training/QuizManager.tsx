import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { trainingApi, type TrainingQuizListItem } from '../../api/training.api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import CreateQuizModal from './CreateQuizModal';
import ExportResultsModal from './ExportResultsModal';
import QuizDetail from './QuizDetail';
import { CalendarIcon, ClockIcon, DownloadIcon, ListIcon, PlusIcon } from './icons';

/** Super Admin view: the list of quizzes, or one quiz's results (`?quiz=<id>`). */
export default function QuizManager() {
  const { t, i18n } = useTranslation('training');
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('quiz');

  const [quizzes, setQuizzes] = useState<TrainingQuizListItem[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [assignOnOpen, setAssignOnOpen] = useState(false);
  const [now, setNow] = useState(0);

  const load = useCallback(() => {
    trainingApi
      .listQuizzes()
      .then((list) => {
        setNow(Date.now());
        setQuizzes(list);
      })
      .catch(() => setQuizzes([]));
  }, []);

  useEffect(() => {
    if (!selectedId) load();
  }, [selectedId, load]);

  const openQuiz = (id: string, withAssign = false) => {
    setAssignOnOpen(withAssign);
    setParams({ quiz: id });
  };

  if (selectedId) {
    return <QuizDetail quizId={selectedId} openAssign={assignOnOpen} onBack={() => setParams({})} />;
  }

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('manager.subtitle')}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!!quizzes?.length && (
              <Button variant="outline" icon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
                {t('export.button')}
              </Button>
            )}
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('manager.newQuiz')}</Button>
          </div>
        }
      />

      {!quizzes ? (
        <Spinner center size="lg" />
      ) : !quizzes.length ? (
        <div className="card training-empty">
          <ListIcon size={40} />
          <strong>{t('manager.emptyTitle')}</strong>
          <span>{t('manager.emptyHint')}</span>
          <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('manager.newQuiz')}</Button>
        </div>
      ) : (
        <div className="training-quiz-grid">
          {quizzes.map((q, i) => {
            const pct = q.assigned_count ? Math.round((q.completed_count / q.assigned_count) * 100) : 0;
            const closed = new Date(q.deadline).getTime() < now;
            return (
              <motion.button
                key={q.id}
                type="button"
                className="training-quiz-card"
                onClick={() => openQuiz(q.id)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
              >
                <div className="training-quiz-card-head">
                  <h3>{q.title}</h3>
                  <span className={`training-pill ${closed ? 'is-closed' : ''}`}>
                    {closed ? t('manager.closed') : t('manager.open')}
                  </span>
                </div>
                <div className="training-meta">
                  <span><CalendarIcon /> {formatDate(q.deadline, i18n.language)}</span>
                  <span><ClockIcon /> {t('duration', { count: q.duration_minutes })}</span>
                  <span><ListIcon /> {t('questionCount', { count: q.question_count })}</span>
                </div>
                <div className="training-quiz-card-progress">
                  <div className="training-bar"><div style={{ width: `${pct}%` }} /></div>
                  <span>
                    {q.assigned_count
                      ? t('manager.completedOf', { done: q.completed_count, total: q.assigned_count })
                      : t('manager.notAssigned')}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title={t('export.title')} size="md">
        {exportOpen && quizzes && <ExportResultsModal quizzes={quizzes} onClose={() => setExportOpen(false)} />}
      </Modal>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('create.title')} size="lg">
        {createOpen && (
          <CreateQuizModal
            onClose={() => setCreateOpen(false)}
            onCreated={(id) => {
              setCreateOpen(false);
              openQuiz(id, true);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
