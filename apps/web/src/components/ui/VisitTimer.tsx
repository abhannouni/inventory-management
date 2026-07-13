import { useTranslation } from 'react-i18next';
import { useVisitTimer } from '../../hooks/useVisitTimer';
import { formatDate, formatDuration } from '../../utils/format';
import type { Visit } from '../../types';

interface VisitTimerProps {
  visit: Visit | null;
  /** `card` is the prominent panel shown during an active visit; `inline` is a compact chip. */
  variant?: 'card' | 'inline';
}

/**
 * Elapsed-time display for a visit. Runs while the visit is open and freezes on
 * the server-computed duration once it is checked out.
 */
export default function VisitTimer({ visit, variant = 'card' }: VisitTimerProps) {
  const { t, i18n } = useTranslation('visits');
  const elapsed = useVisitTimer(visit);

  if (!visit) return null;

  const running = visit.status === 'open';
  const clock = formatDuration(elapsed);

  if (variant === 'inline') {
    return (
      <span className={`visit-timer-chip ${running ? 'is-running' : ''}`}>
        {running && <span className="visit-timer-pulse" aria-hidden="true" />}
        <time dateTime={`PT${elapsed}S`}>{clock}</time>
      </span>
    );
  }

  return (
    <div className={`visit-timer ${running ? 'is-running' : 'is-stopped'}`} role="timer">
      <div className="visit-timer-head">
        {running && <span className="visit-timer-pulse" aria-hidden="true" />}
        <span className="visit-timer-label">
          {running ? t('timer.inProgress') : t('timer.completed')}
        </span>
      </div>

      {/* aria-live=off: announcing every second would flood a screen reader. The
          final duration is surfaced separately once the visit is checked out. */}
      <time
        className="visit-timer-value"
        dateTime={`PT${elapsed}S`}
        aria-live="off"
      >
        {clock}
      </time>

      <div className="visit-timer-meta">
        {t('timer.startedAt', { time: formatDate(visit.checkin_at, i18n.language) })}
      </div>
    </div>
  );
}
