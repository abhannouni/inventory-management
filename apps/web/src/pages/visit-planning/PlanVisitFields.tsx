import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { nextFreeTime } from './timeSlots';

/**
 * One "add" from a planning form. Each point of sale carries its own hour,
 * because a time slot holds exactly one visit — you cannot be at two of them
 * at 10:00.
 */
export interface PlanVisitDraft {
  picks: { store_id: string; time: string }[];
  notes?: string;
  repeatWeekdays?: number[];
  extraDays?: number[];
}

interface PlanVisitFieldsProps {
  stores: { id: string; name: string }[];
  /** Points of sale already on this day — the same one is never visited twice. */
  takenStoreIds: string[];
  /** Hours already spoken for on this day — one visit per slot. */
  takenTimes: string[];
  /** Day numbers offered under "also add specific days"; empty hides that block. */
  otherMonthDays: number[];
  /** Emits the draft, or null while it is incomplete or clashing. */
  onChange: (draft: PlanVisitDraft | null) => void;
}

/**
 * The point-of-sale / hour / repeat block shared by the supervisor's own day
 * form and the reviewer's "plan for someone" form, so the two never drift.
 *
 * Holds its own state and reports upward: the parent owns the submit button and
 * decides what a valid draft is used for.
 */
export default function PlanVisitFields({
  stores,
  takenStoreIds,
  takenTimes,
  otherMonthDays,
  onChange,
}: PlanVisitFieldsProps) {
  const { t } = useTranslation('planning');
  const [picks, setPicks] = useState<{ store_id: string; time: string }[]>([]);
  const [notes, setNotes] = useState('');
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeatWeekdays, setRepeatWeekdays] = useState<number[]>([]);
  const [extraDaysOn, setExtraDaysOn] = useState(false);
  const [extraDays, setExtraDays] = useState<number[]>([]);

  const weekdayLabels = t('weekdaysShort', { returnObjects: true }) as string[];

  const isTaken = (id: string) => takenStoreIds.includes(id);
  const storeName = (id: string) => stores.find((st) => st.id === id)?.name ?? id;

  const toggleStore = (id: string) =>
    setPicks((cur) =>
      cur.some((p) => p.store_id === id)
        ? cur.filter((p) => p.store_id !== id)
        : [...cur, { store_id: id, time: nextFreeTime([...takenTimes, ...cur.map((p) => p.time)]) }],
    );

  const setPickTime = (id: string, value: string) =>
    setPicks((cur) => cur.map((p) => (p.store_id === id ? { ...p, time: value } : p)));

  const toggleWeekday = (idx: number) =>
    setRepeatWeekdays((cur) => (cur.includes(idx) ? cur.filter((d) => d !== idx) : [...cur, idx]));

  const toggleExtraDay = (dayNum: number) =>
    setExtraDays((cur) => (cur.includes(dayNum) ? cur.filter((d) => d !== dayNum) : [...cur, dayNum]));

  /** Two picks on the same hour, or an hour the day already holds. */
  const clashingTimes = (() => {
    const seen = new Set<string>();
    const clash = new Set<string>();
    for (const p of picks) {
      if (!p.time) continue;
      if (seen.has(p.time) || takenTimes.includes(p.time)) clash.add(p.time);
      seen.add(p.time);
    }
    return clash;
  })();

  const valid = picks.length > 0 && picks.every((p) => p.time) && clashingTimes.size === 0;

  useEffect(() => {
    onChange(
      valid
        ? {
            picks,
            notes: notes || undefined,
            repeatWeekdays: repeatOn ? repeatWeekdays : undefined,
            extraDays: extraDaysOn ? extraDays : undefined,
          }
        : null,
    );
    // `onChange` is a fresh closure on every parent render; depending on it
    // would loop. The draft itself is what the parent needs to react to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks, notes, repeatOn, repeatWeekdays, extraDaysOn, extraDays, valid]);

  return (
    <>
      <div className="form-group">
        <label className="form-label">{t('form.storesLabel')}</label>
        <div className="planning-store-picker">
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={isTaken(s.id)}
              title={isTaken(s.id) ? t('form.alreadyPlannedToday') : undefined}
              className={`planning-store-chip${picks.some((p) => p.store_id === s.id) ? ' active' : ''}${isTaken(s.id) ? ' taken' : ''}`}
              onClick={() => toggleStore(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
        <p className="planning-repeat-hint">{t('form.storesHint')}</p>
      </div>

      {picks.length > 0 && (
        <div className="form-group">
          <label className="form-label">{t('form.timesLabel')}</label>
          <div className="planning-pick-list">
            {picks.map((pick) => (
              <div
                key={pick.store_id}
                className={`planning-pick-row${pick.time && clashingTimes.has(pick.time) ? ' clash' : ''}`}
              >
                <span className="planning-pick-store">{storeName(pick.store_id)}</span>
                <input
                  type="time"
                  className="form-input"
                  value={pick.time}
                  required
                  onChange={(e) => setPickTime(pick.store_id, e.target.value)}
                />
                <button
                  type="button"
                  className="sli-btn delete"
                  onClick={() => toggleStore(pick.store_id)}
                  title={t('dayDetail.delete')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {clashingTimes.size > 0 && <p className="planning-adjust-error">{t('form.timeClash')}</p>}
          <p className="planning-repeat-hint">{t('form.timesHint')}</p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          {t('form.notesLabel')} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t('form.notesOptional')}</span>
        </label>
        <textarea
          className="form-input"
          rows={3}
          placeholder={t('form.notesPlaceholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="planning-repeat-box">
        <label className="planning-repeat-toggle">
          <input type="checkbox" checked={repeatOn} onChange={(e) => setRepeatOn(e.target.checked)} />
          {t('form.repeatToggle')}
        </label>
        {repeatOn && (
          <>
            <div className="planning-weekday-picker">
              {weekdayLabels.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`planning-weekday-chip${repeatWeekdays.includes(idx) ? ' active' : ''}`}
                  onClick={() => toggleWeekday(idx)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="planning-repeat-hint">{t('form.repeatHint')}</p>
          </>
        )}
      </div>

      {otherMonthDays.length > 0 && (
        <div className="planning-repeat-box">
          <label className="planning-repeat-toggle">
            <input type="checkbox" checked={extraDaysOn} onChange={(e) => setExtraDaysOn(e.target.checked)} />
            {t('form.extraDaysToggle')}
          </label>
          {extraDaysOn && (
            <>
              <div className="planning-day-picker">
                {otherMonthDays.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`planning-day-chip${extraDays.includes(d) ? ' active' : ''}`}
                    onClick={() => toggleExtraDay(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="planning-repeat-hint">{t('form.extraDaysHint')}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}
