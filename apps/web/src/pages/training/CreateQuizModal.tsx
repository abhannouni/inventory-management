import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { trainingApi, type QuizAnswerMode, type QuizImportResult } from '../../api/training.api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { downloadTrainingQuizTemplate } from '../../utils/trainingQuizTemplate';
import { toDateTimeLocal } from '../../utils/calendar';
import { DurationField } from './QuizFields';

interface Props {
  onClose: () => void;
  onCreated: (quizId: string) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateQuizModal({ onClose, onCreated }: Props) {
  const { t } = useTranslation('training');
  const { t: tCommon } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(Date.now() + 7 * 86_400_000);
    d.setHours(18, 0, 0, 0);
    return toDateTimeLocal(d);
  });
  const [answerMode, setAnswerMode] = useState<QuizAnswerMode>('single');
  const [duration, setDuration] = useState('15');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuizImportResult | null>(null);
  const [formError, setFormError] = useState('');

  const handlePickFile = (f: File | null) => {
    setFile(f);
    setResult(null);
  };

  const handleRemoveFile = () => {
    handlePickFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const minutes = Number(duration);
    if (!title.trim()) return setFormError(t('create.errors.title'));
    if (!deadline || new Date(deadline).getTime() <= Date.now()) return setFormError(t('create.errors.deadline'));
    if (!Number.isInteger(minutes) || minutes < 1) return setFormError(t('create.errors.duration'));
    if (!file) return setFormError(t('create.errors.file'));
    setFormError('');

    setLoading(true);
    try {
      const res = await trainingApi.importQuiz(
        {
          title: title.trim(),
          description: description.trim() || undefined,
          deadline: new Date(deadline).toISOString(),
          answer_mode: answerMode,
          duration_minutes: minutes,
        },
        file,
      );
      if (res.quiz) {
        toast.success(t('create.success', { count: res.question_count }));
        onCreated(res.quiz.id);
      } else {
        setResult(res);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="training-step-label">{t('create.step1')}</p>

      <Input label={t('create.fields.title')} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />

      <div className="form-group">
        <label className="form-label" htmlFor="quiz-description">
          {t('create.fields.description')} <span className="training-optional">{t('create.optional')}</span>
        </label>
        <textarea
          id="quiz-description"
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

      <div className="form-group">
        <label className="form-label">{t('create.fields.answerMode')}</label>
        <div className="training-segmented">
          {(['single', 'multiple'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`training-segment ${answerMode === mode ? 'is-active' : ''}`}
              onClick={() => { setAnswerMode(mode); setResult(null); }}
            >
              <strong>{t(`answerMode.${mode}`)}</strong>
              <span>{t(`answerMode.${mode}Hint`)}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="training-step-label">{t('create.step2')}</p>

      <div className="import-template-card">
        <span className="import-template-icon"><FileExcelIcon /></span>
        <div className="import-template-text">
          <strong>{t('create.templateTitle')}</strong>
          <span>{t('create.templateHint')}</span>
        </div>
        <Button type="button" variant="outline" size="sm" icon={<DownloadIcon />} onClick={() => downloadTrainingQuizTemplate()}>
          {t('create.downloadTemplate')}
        </Button>
      </div>

      <div className="form-group">
        {file ? (
          <div className="import-file-chip">
            <span className="import-file-chip-icon"><FileExcelIcon /></span>
            <div className="import-file-chip-info">
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
            <button type="button" className="import-file-chip-remove" onClick={handleRemoveFile} aria-label={tCommon('actions.close')}>
              <XIcon />
            </button>
          </div>
        ) : (
          <button type="button" className="import-dropzone" onClick={() => fileInputRef.current?.click()}>
            <UploadCloudIcon />
            <strong>{t('create.chooseFile')}</strong>
            <span>{t('create.fileHint')}</span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          style={{ display: 'none' }}
          onChange={(e) => handlePickFile(e.target.files?.[0] || null)}
        />
      </div>

      {result && result.errors.length > 0 && (
        <div className="import-summary">
          <div className="training-import-error-head">{t('create.fixErrors')}</div>
          <div className="import-error-list">
            {result.errors.map((e, i) => (
              <div key={i} className="import-error-row">
                {e.row > 0 && <span className="row-num">{t('create.rowLabel', { row: e.row })}</span>}
                <span className="row-msg">{e.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {formError && <p className="form-error" style={{ marginTop: 12 }}>{formError}</p>}

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="submit" loading={loading}>{t('create.submit')}</Button>
      </div>
    </form>
  );
}

function FileExcelIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M8 13l2.5 5M10.5 13L8 18" />
      <path d="M16 13l-2.5 5M13.5 13l2.5 5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16l-4-4-4 4" /><path d="M12 12v9" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
