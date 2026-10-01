import { useTranslation } from 'react-i18next';
import type { WeekDays } from '../../api/hr.api';
import { DAYS_PER_WEEK, dayMinutes, formatMinutes, formatShift, weekdayNames } from './hrUtils';

/** A compact read-only week: one cell per day with its hours, tooltip with the shift. */
export default function WeekStrip({ days }: { days: WeekDays | null }) {
  const { t, i18n } = useTranslation('hr');
  const names = weekdayNames(i18n.language, 'narrow');
  const full = weekdayNames(i18n.language);

  return (
    <div className="wh-strip">
      {Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
        const day = days?.[i] ?? null;
        return (
          <span
            key={i}
            className={`wh-strip-day ${day ? 'is-on' : ''}`}
            title={`${full[i]} · ${formatShift(day, t)}`}
          >
            <span className="wh-strip-name">{names[i]}</span>
            <span className="wh-strip-hours">{day ? formatMinutes(dayMinutes(day)) : '—'}</span>
          </span>
        );
      })}
    </div>
  );
}
