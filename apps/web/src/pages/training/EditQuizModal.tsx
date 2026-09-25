import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { trainingApi, type TrainingQuiz } from '../../api/training.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { toDateTimeLocal } from '../../utils/calendar';
import { DurationField } from './QuizFields';

interface Props {
  quiz: TrainingQuiz;
  onClose: () => void;
  onSaved: () => void;
}

/** Questions are fixed once created — only the framing (title, deadline…) can change. */
export default function EditQuizModal({ quiz, onClose, onSaved }: Props) {
  const { t } = useTranslation('training');
  const { t: tCommon } = useTranslation('common');
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description ?? '');
  const [deadline, setDeadline] = useState(toDateTimeLocal(new Date(quiz.deadline)));
  const [duration, setDuration] = useState(String(quiz.duration_minutes));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const minutes = Number(duration);
    if (!title.trim()) return setFormError(t('create.errors.title'));
    if (!deadline) return setFormError(t('create.errors.deadline'));
    if (!Number.isInteger(minutes) || minutes < 1) return setFormError(t('create.errors.duration'));
    setFormError('');

    setSaving(true);
    try {
      await trainingApi.updateQuiz(quiz.id, {
        title: title.trim(),
        description: description.trim(),
        deadline: new Date(deadline).toISOString(),
        duration_minutes: minutes,
      });
      toast.success(t('edit.success'));
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <Input label={t('create.fields.title')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
      <div className="form-group">
        <label className="form-label" htmlFor="edit-quiz-description">
          {t('create.fields.description')} <span className="training-optional">{t('create.optional')}</span>
        </label>
        <textarea
          id="edit-quiz-description"
          className="form-textarea"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </div>
      <div className="form-row">
        <Input
          label={t('create.fields.deadline')}
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
        <DurationField value={duration} onChange={setDuration} />
      </div>
      <p className="training-muted">{t('edit.questionsLocked')}</p>

      {formError && <p className="form-error" style={{ marginTop: 12 }}>{formError}</p>}

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={saving}>{tCommon('actions.save')}</Button>
      </div>
    </form>
  );
}
