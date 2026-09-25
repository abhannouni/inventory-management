import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { trainingApi, type TrainingQuizListItem } from '../../api/training.api';
import Button from '../../components/ui/Button';
import { formatDateOnly } from '../../utils/format';
import { downloadTrainingResults } from '../../utils/trainingResultsExport';

interface Props {
  quizzes: TrainingQuizListItem[];
  onClose: () => void;
}

/** Pick one or more questionnaires and download their results as one Excel file. */
export default function ExportResultsModal({ quizzes, onClose }: Props) {
  const { t, i18n } = useTranslation('training');
  const { t: tCommon } = useTranslation('common');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const allSelected = selected.size === quizzes.length && quizzes.length > 0;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleDownload = async () => {
    setBusy(true);
    try {
      const data = await trainingApi.exportResults([...selected]);
      await downloadTrainingResults(data, t, i18n.language);
      toast.success(t('export.success'));
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="training-modal-hint">{t('export.hint')}</p>

      <label className="training-check training-check-all">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={() => setSelected(allSelected ? new Set() : new Set(quizzes.map((q) => q.id)))}
        />
        <span>{t('export.selectAll')}</span>
      </label>

      <div className="training-check-list">
        {quizzes.map((q) => (
          <label key={q.id} className={`training-check ${selected.has(q.id) ? 'is-checked' : ''}`}>
            <input type="checkbox" checked={selected.has(q.id)} onChange={() => toggle(q.id)} />
            <span className="training-check-text">
              <strong>{q.title}</strong>
              <span className="training-muted">
                {formatDateOnly(q.deadline, i18n.language)} · {t('manager.completedOf', { done: q.completed_count, total: q.assigned_count })}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onClose} disabled={busy}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="button" onClick={handleDownload} loading={busy} disabled={!selected.size}>
          {t('export.download', { count: selected.size })}
        </Button>
      </div>
    </div>
  );
}
