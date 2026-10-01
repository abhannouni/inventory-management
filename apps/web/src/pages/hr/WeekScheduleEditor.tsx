import { useTranslation } from 'react-i18next';
import type { ScheduleDay, WeekDays } from '../../api/hr.api';
import {
  BREAK_OPTIONS,
  DAYS_PER_WEEK,
  STANDARD_DAY,
  dayError,
  dayMinutes,
  formatMinutes,
  weekMinutes,
  weekdayNames,
} from './hrUtils';

interface Props {
  value: WeekDays;
  onChange: (days: WeekDays) => void;
  disabled?: boolean;
}

const PRESETS: { key: string; days: WeekDays }[] = [
  {
    key: 'weekdays',
    days: [STANDARD_DAY, STANDARD_DAY, STANDARD_DAY, STANDARD_DAY, STANDARD_DAY, null, null],
  },
  {
    key: 'weekdaysSaturday',
    days: [
      STANDARD_DAY,
      STANDARD_DAY,
      STANDARD_DAY,
      STANDARD_DAY,
      STANDARD_DAY,
      { start: '09:00', end: '13:00', break_minutes: 0 },
      null,
    ],
  },
  {
    key: 'sixDays',
    days: [
      ...Array.from({ length: 6 }, () => ({ start: '08:30', end: '16:30', break_minutes: 30 })),
      null,
    ],
  },
];

/** Seven rows, Monday first: a working-day toggle, start, end and break. */
export default function WeekScheduleEditor({ value, onChange, disabled }: Props) {
  const { t, i18n } = useTranslation('hr');
  const names = weekdayNames(i18n.language);

  const setDay = (index: number, day: ScheduleDay | null) =>
    onChange(value.map((d, i) => (i === index ? day : d)));

  const patchDay = (index: number, patch: Partial<ScheduleDay>) => {
    const current = value[index];
    if (current) setDay(index, { ...current, ...patch });
  };

  // Copies the first working day onto every other working day.
  const firstWorking = value.find((d) => d !== null) ?? null;
  const copyToWorkingDays = () => {
    if (!firstWorking) return;
    onChange(value.map((d) => (d ? { ...firstWorking } : null)));
  };

  return (
    <div className="wh-editor">
      <div className="wh-editor-presets">
        <span className="wh-editor-presets-label">{t('editor.presets')}</span>
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className="wh-chip"
            disabled={disabled}
            onClick={() => onChange(p.days.map((d) => (d ? { ...d } : null)))}
          >
            {t(`editor.preset.${p.key}`)}
          </button>
        ))}
        <button
          type="button"
          className="wh-chip"
          disabled={disabled || !firstWorking}
          onClick={copyToWorkingDays}
          title={t('editor.copyFirstHint')}
        >
          {t('editor.copyFirst')}
        </button>
      </div>

      <div className="wh-editor-rows">
        {Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
          const day = value[i];
          const error = dayError(day, t);
          return (
            <div key={i} className={`wh-editor-row ${day ? '' : 'is-off'} ${error ? 'is-error' : ''}`}>
              <label className="wh-editor-day">
                <input
                  type="checkbox"
                  checked={!!day}
                  disabled={disabled}
                  onChange={(e) => setDay(i, e.target.checked ? { ...(firstWorking ?? STANDARD_DAY) } : null)}
                />
                <span>{names[i]}</span>
              </label>

              {day ? (
                <>
                  <div className="wh-editor-times">
                    <input
                      type="time"
                      className="form-input"
                      value={day.start}
                      disabled={disabled}
                      aria-label={t('editor.start')}
                      onChange={(e) => patchDay(i, { start: e.target.value })}
                    />
                    <span className="wh-editor-sep">→</span>
                    <input
                      type="time"
                      className="form-input"
                      value={day.end}
                      disabled={disabled}
                      aria-label={t('editor.end')}
                      onChange={(e) => patchDay(i, { end: e.target.value })}
                    />
                  </div>
                  <select
                    className="form-select wh-editor-break"
                    value={day.break_minutes}
                    disabled={disabled}
                    aria-label={t('editor.break')}
                    onChange={(e) => patchDay(i, { break_minutes: Number(e.target.value) })}
                  >
                    {BREAK_OPTIONS.map((m) => (
                      <option key={m} value={m}>
                        {m === 0 ? t('editor.noBreak') : t('editor.breakOption', { minutes: m })}
                      </option>
                    ))}
                  </select>
                  <span className="wh-editor-total">{formatMinutes(dayMinutes(day))}</span>
                  {error && <span className="wh-editor-error">{error}</span>}
                </>
              ) : (
                <span className="wh-editor-offlabel">{t('schedule.dayOff')}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="wh-editor-footer">
        <span>{t('editor.weeklyTotal')}</span>
        <strong>{formatMinutes(weekMinutes(value))}</strong>
      </div>
    </div>
  );
}

