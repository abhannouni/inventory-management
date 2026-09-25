import { useTranslation } from 'react-i18next';

const DURATION_PRESETS = [5, 10, 15, 30, 60];

/** Minutes input with one-tap presets — shared by the create and edit forms. */
export function DurationField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation('training');
  return (
    <div className="form-group">
      <label className="form-label" htmlFor="quiz-duration">{t('create.fields.duration')}</label>
      <input
        id="quiz-duration"
        className="form-input"
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="training-presets">
        {DURATION_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            className={`training-preset ${Number(value) === m ? 'is-active' : ''}`}
            onClick={() => onChange(String(m))}
          >
            {t('duration', { count: m })}
          </button>
        ))}
      </div>
    </div>
  );
}
