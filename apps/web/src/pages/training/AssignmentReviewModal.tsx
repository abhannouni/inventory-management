import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trainingApi, type TrainingAssignmentReview } from '../../api/training.api';
import Spinner from '../../components/ui/Spinner';
import { formatDate, formatRole } from '../../utils/format';

/** One user's answers, question by question, with the right answers alongside. */
export default function AssignmentReviewModal({ assignmentId }: { assignmentId: string }) {
  const { t, i18n } = useTranslation('training');
  const [data, setData] = useState<TrainingAssignmentReview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    trainingApi.reviewAssignment(assignmentId).then(setData).catch((e: Error) => setError(e.message));
  }, [assignmentId]);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <Spinner center />;

  const pct = data.total && data.score !== null ? Math.round((data.score / data.total) * 100) : 0;

  return (
    <div>
      <div className="training-review-head">
        <div>
          <strong>{data.user.full_name}</strong>
          <div className="training-muted">
            {formatRole(data.user.role)}
            {data.submitted_at && ` · ${formatDate(data.submitted_at, i18n.language)}`}
          </div>
        </div>
        <div className="training-review-score">
          <strong>{data.score ?? 0}/{data.total}</strong>
          <span>{pct}%</span>
        </div>
      </div>
      {data.leave_count > 0 && (
        <p className="training-review-leaves">{t('review.leaves', { count: data.leave_count })}</p>
      )}

      <div className="training-review-list">
        {data.questions.map((q) => (
          <div key={q.id} className={`training-review-item ${q.is_correct ? 'is-right' : 'is-wrong'}`}>
            <div className="training-review-q">
              <span className="training-question-num">{q.position}</span>
              <span>{q.text}</span>
              <span className="training-review-verdict">
                {!q.answered ? t('review.unanswered') : q.is_correct ? t('review.right') : t('review.wrong')}
              </span>
            </div>
            <ul className="training-option-list">
              {q.options.map((o) => (
                <li
                  key={o.id}
                  className={[o.is_correct ? 'is-correct' : '', o.selected && !o.is_correct ? 'is-wrong-pick' : ''].join(' ')}
                >
                  <span className="training-option-mark">{o.is_correct ? '✓' : o.selected ? '✗' : ''}</span>
                  {o.text}
                  {o.selected && <span className="training-picked">{t('review.picked')}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
