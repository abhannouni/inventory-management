import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import {
  trainingApi,
  type AssignmentStatus,
  type TrainingAssignmentRow,
  type TrainingQuizDetail,
} from '../../api/training.api';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatDurationShort, formatRole } from '../../utils/format';
import StatusBadge from './StatusBadge';
import AssignQuizModal from './AssignQuizModal';
import EditQuizModal from './EditQuizModal';
import AssignmentReviewModal from './AssignmentReviewModal';
import { downloadTrainingResults } from '../../utils/trainingResultsExport';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, DownloadIcon, EyeOffIcon, ListIcon, UsersIcon } from './icons';

interface Props {
  quizId: string;
  /** Open the assign dialog as soon as the quiz loads — used right after creating one. */
  openAssign?: boolean;
  onBack: () => void;
}

type Tab = 'results' | 'questions';
type Filter = 'all' | 'completed' | 'pending' | 'missed';

const FILTER_MATCH: Record<Filter, (s: AssignmentStatus) => boolean> = {
  all: () => true,
  completed: (s) => s === 'completed',
  pending: (s) => s === 'not_started' || s === 'in_progress',
  missed: (s) => s === 'missed',
};

export default function QuizDetail({ quizId, openAssign = false, onBack }: Props) {
  const { t, i18n } = useTranslation('training');
  const { t: tCommon } = useTranslation('common');

  const [data, setData] = useState<TrainingQuizDetail | null>(null);
  const [loadedAt, setLoadedAt] = useState(0);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('results');
  const [filter, setFilter] = useState<Filter>('all');
  const [assignOpen, setAssignOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [unassignRow, setUnassignRow] = useState<TrainingAssignmentRow | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const autoOpened = useRef(false);

  const load = useCallback(() => {
    trainingApi
      .getQuiz(quizId)
      .then((d) => {
        setLoadedAt(Date.now());
        setData(d);
      })
      .catch((e: Error) => setError(e.message));
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data && openAssign && !autoOpened.current) {
      autoOpened.current = true;
      setAssignOpen(true);
    }
  }, [data, openAssign]);

  const rows = useMemo(
    () => (data ? data.assignments.filter((a) => FILTER_MATCH[filter](a.status)) : []),
    [data, filter],
  );

  if (error) {
    return (
      <div>
        <Button variant="ghost" size="sm" icon={<ArrowLeftIcon />} onClick={onBack}>{t('detail.back')}</Button>
        <div className="card training-empty">{error}</div>
      </div>
    );
  }
  if (!data) return <Spinner center size="lg" />;

  const { quiz, stats } = data;
  const pending = stats.not_started + stats.in_progress;
  const total = quiz.questions.length;
  const deadlinePassed = new Date(quiz.deadline).getTime() < loadedAt;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await trainingApi.removeQuiz(quiz.id);
      toast.success(t('detail.deleted'));
      onBack();
    } catch (e) {
      toast.error((e as Error).message);
      setDeleting(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignRow) return;
    setUnassigning(true);
    try {
      await trainingApi.unassign(unassignRow.id);
      toast.success(t('detail.unassigned'));
      setUnassignRow(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUnassigning(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadTrainingResults(await trainingApi.exportResults([quiz.id]), t, i18n.language);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const filters: { key: Filter; count: number }[] = [
    { key: 'all', count: stats.assigned },
    { key: 'completed', count: stats.completed },
    { key: 'pending', count: pending },
    { key: 'missed', count: stats.missed },
  ];

  return (
    <div>
      <div className="training-detail-back">
        <Button variant="ghost" size="sm" icon={<ArrowLeftIcon />} onClick={onBack}>{t('detail.back')}</Button>
      </div>

      <motion.div className="training-detail-head" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="training-detail-title">
          <h1 className="page-title">{quiz.title}</h1>
          {quiz.description && <p className="page-subtitle">{quiz.description}</p>}
          <div className="training-meta">
            <span><CalendarIcon /> {t('my.deadline', { date: formatDate(quiz.deadline, i18n.language) })}</span>
            <span><ClockIcon /> {t('duration', { count: quiz.duration_minutes })}</span>
            <span><ListIcon /> {t('questionCount', { count: total })}</span>
            <span>{t(`answerMode.${quiz.answer_mode}`)}</span>
            {deadlinePassed && <Badge variant="danger">{t('manager.closed')}</Badge>}
          </div>
        </div>
        <div className="training-detail-actions">
          <Button icon={<UsersIcon />} onClick={() => setAssignOpen(true)}>{t('detail.assign')}</Button>
          <Button variant="outline" icon={<DownloadIcon />} onClick={handleExport} loading={exporting}>
            {t('export.buttonShort')}
          </Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}>{tCommon('actions.edit')}</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>{tCommon('actions.delete')}</Button>
        </div>
      </motion.div>

      <div className="training-stats">
        <div className="training-stat">
          <span className="training-stat-label">{t('stats.assigned')}</span>
          <span className="training-stat-value">{stats.assigned}</span>
        </div>
        <div className="training-stat">
          <span className="training-stat-label">{t('stats.completed')}</span>
          <span className="training-stat-value is-good">{stats.completed}</span>
        </div>
        <div className="training-stat">
          <span className="training-stat-label">{t('stats.pending')}</span>
          <span className="training-stat-value is-warning">{pending}</span>
          {stats.in_progress > 0 && (
            <span className="training-stat-hint">{t('stats.inProgressHint', { count: stats.in_progress })}</span>
          )}
        </div>
        <div className="training-stat">
          <span className="training-stat-label">{t('stats.missed')}</span>
          <span className={`training-stat-value ${stats.missed ? 'is-bad' : ''}`}>{stats.missed}</span>
        </div>
        <div className="training-stat">
          <span className="training-stat-label">{t('stats.average')}</span>
          <span className="training-stat-value">
            {stats.average_score_pct === null ? '—' : `${stats.average_score_pct}%`}
          </span>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-item ${tab === 'results' ? 'active' : ''}`} onClick={() => setTab('results')}>
          {t('detail.tabs.results')}
        </button>
        <button className={`tab-item ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          {t('detail.tabs.questions')}
        </button>
      </div>

      {tab === 'results' ? (
        <>
          <div className="training-filter-chips">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`training-chip ${filter === f.key ? 'is-active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {t(`filters.${f.key}`)} <span>{f.count}</span>
              </button>
            ))}
          </div>

          <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <DataTable
              columns={[
                {
                  key: 'user',
                  header: t('results.user'),
                  render: (a: TrainingAssignmentRow) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>{a.user.full_name}</div>
                      <div className="training-muted">{formatRole(a.user.role)}</div>
                    </div>
                  ),
                },
                { key: 'status', header: t('results.status'), render: (a: TrainingAssignmentRow) => <StatusBadge status={a.status} /> },
                {
                  key: 'score',
                  header: t('results.score'),
                  render: (a: TrainingAssignmentRow) =>
                    a.status === 'completed' && a.score !== null ? (
                      <ScoreCell score={a.score} total={a.total} />
                    ) : (
                      <span className="training-muted">—</span>
                    ),
                },
                {
                  key: 'time',
                  header: t('results.time'),
                  hideOnMobile: true,
                  render: (a: TrainingAssignmentRow) => formatDurationShort(a.duration_seconds),
                },
                {
                  key: 'submitted',
                  header: t('results.submittedAt'),
                  hideOnMobile: true,
                  render: (a: TrainingAssignmentRow) => (a.submitted_at ? formatDate(a.submitted_at, i18n.language) : '—'),
                },
                {
                  key: 'leaves',
                  header: t('results.leaves'),
                  hideOnMobile: true,
                  render: (a: TrainingAssignmentRow) =>
                    a.leave_count > 0 ? (
                      <span className="training-leaves" title={t('results.leavesHint')}>
                        <EyeOffIcon /> {a.leave_count}
                      </span>
                    ) : (
                      <span className="training-muted">0</span>
                    ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (a: TrainingAssignmentRow) => (
                    <div className="table-actions">
                      {a.status === 'completed' && (
                        <Button variant="outline" size="sm" onClick={() => setReviewId(a.id)}>{t('results.view')}</Button>
                      )}
                      {!a.started_at && (
                        <Button variant="ghost" size="sm" onClick={() => setUnassignRow(a)}>{t('results.unassign')}</Button>
                      )}
                    </div>
                  ),
                },
              ]}
              data={rows}
              keyExtractor={(a) => a.id}
              emptyMessage={stats.assigned ? t('results.emptyFilter') : t('results.empty')}
            />
          </motion.div>
        </>
      ) : (
        <div className="training-question-list">
          {quiz.questions.map((q) => {
            const qs = data.question_stats.find((s) => s.question_id === q.id);
            const pct = qs && qs.respondent_count ? Math.round((qs.correct_count / qs.respondent_count) * 100) : null;
            return (
              <div key={q.id} className="card training-question-card">
                <div className="training-question-card-head">
                  <span className="training-question-num">{q.position}</span>
                  <strong>{q.text}</strong>
                </div>
                <ul className="training-option-list">
                  {q.options.map((o) => (
                    <li key={o.id} className={o.is_correct ? 'is-correct' : ''}>
                      <span className="training-option-mark">{o.is_correct ? '✓' : ''}</span>
                      {o.text}
                    </li>
                  ))}
                </ul>
                <div className="training-question-rate">
                  {pct === null ? (
                    <span className="training-muted">{t('questions.noAnswers')}</span>
                  ) : (
                    <>
                      <div className="training-bar"><div style={{ width: `${pct}%` }} /></div>
                      <span>{t('questions.correctRate', { pct, correct: qs!.correct_count, total: qs!.respondent_count })}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title={t('assign.title')} size="md">
        {assignOpen && (
          <AssignQuizModal
            quizId={quiz.id}
            alreadyAssigned={data.assignments.map((a) => a.user.id)}
            onClose={() => setAssignOpen(false)}
            onAssigned={() => {
              setAssignOpen(false);
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={t('edit.title')} size="md">
        {editOpen && (
          <EditQuizModal
            quiz={quiz}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              load();
            }}
          />
        )}
      </Modal>

      <Modal open={!!reviewId} onClose={() => setReviewId(null)} title={t('review.title')} size="lg">
        {reviewId && <AssignmentReviewModal assignmentId={reviewId} />}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
        message={t('detail.deleteConfirm')}
      />

      <ConfirmDialog
        open={!!unassignRow}
        onClose={() => setUnassignRow(null)}
        onConfirm={handleUnassign}
        loading={unassigning}
        confirmLabel={t('results.unassign')}
        message={t('detail.unassignConfirm', { name: unassignRow?.user.full_name ?? '' })}
      />
    </div>
  );
}

function ScoreCell({ score, total }: { score: number; total: number }) {
  const pct = total ? Math.round((score / total) * 100) : 0;
  const tone = pct >= 70 ? 'is-good' : pct >= 50 ? 'is-warning' : 'is-bad';
  return (
    <span className={`training-score ${tone}`}>
      <strong>{score}/{total}</strong> <span>{pct}%</span>
    </span>
  );
}
