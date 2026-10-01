import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { hrApi, type MyToday } from '../../api/hr.api';
import { useAppSelector } from '../../hooks/useAppDispatch';
import WorkStatusBadge from '../../pages/hr/WorkStatusBadge';
import { formatHours, formatShift, formatTime } from '../../pages/hr/hrUtils';
import Button from '../ui/Button';
import '../../pages/hr/hr.css';

const REFRESH_MS = 5 * 60_000;
const TICK_MS = 30_000;

/**
 * The employee's own time clock: a header button showing whether they're
 * clocked in (and for how long today), opening a small panel to clock in/out.
 * Hidden for Super Admins and when HR turns the `hr.time_clock` flag off.
 */
export default function WorkClock() {
  const { t, i18n } = useTranslation('hr');
  const role = useAppSelector((s) => s.auth.user?.role);
  const [data, setData] = useState<MyToday | null>(null);
  const [fetchedAt, setFetchedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hidden = role === 'super_admin';

  const apply = (res: MyToday) => {
    setData(res);
    setFetchedAt(Date.now());
    setNow(Date.now());
  };

  const refresh = useCallback(() => {
    hrApi.myToday().then(apply).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (hidden) return;
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [hidden, refresh]);

  // A running clock ticks locally between refreshes.
  const working = !!data?.is_working;
  useEffect(() => {
    if (!working) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [working]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (hidden || !data || (!data.enabled && !data.open_session)) return null;

  const worked = data.worked_seconds + (working ? Math.max(0, Math.floor((now - fetchedAt) / 1000)) : 0);
  const pct = data.assigned_seconds ? Math.min(100, Math.round((worked / data.assigned_seconds) * 100)) : 0;

  const toggleClock = async () => {
    setBusy(true);
    try {
      const res = working ? await hrApi.clockOut() : await hrApi.clockIn();
      apply(res);
      toast.success(working ? t('clock.clockedOut') : t('clock.clockedIn'));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wh-clock" ref={ref}>
      <button
        type="button"
        className={`wh-clock-btn ${working ? 'is-working' : ''}`}
        onClick={() => {
          if (!open) refresh();
          setOpen((o) => !o);
        }}
        title={working ? t('clock.working') : t('clock.notWorking')}
        aria-expanded={open}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span className="wh-clock-label">{working ? formatHours(worked) : t('clock.clockIn')}</span>
        {working && <span className="wh-clock-dot" aria-hidden="true" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="wh-clock-panel"
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.14 }}
          >
            <div className="wh-clock-head">
              <strong>{t('clock.today')}</strong>
              <WorkStatusBadge status={data.status} size="sm" label={working ? t('status.working') : undefined} />
            </div>

            <div className="wh-clock-shift">
              {data.planned ? formatShift(data.planned, t) : t('clock.noShift')}
            </div>

            <div className="wh-clock-progress">
              <div className="wh-clock-figures">
                <span className="wh-clock-worked">{formatHours(worked)}</span>
                {data.assigned_seconds > 0 && <span className="wh-muted">/ {formatHours(data.assigned_seconds)}</span>}
              </div>
              {data.assigned_seconds > 0 && (
                <span className="wh-bar wh-tone-blue">
                  <span style={{ width: `${pct}%` }} />
                </span>
              )}
            </div>

            {data.sessions.length > 0 && (
              <ul className="wh-clock-sessions">
                {data.sessions.map((s) => (
                  <li key={s.id}>
                    {formatTime(s.clock_in, i18n.language)} – {s.is_open ? t('records.now') : formatTime(s.clock_out, i18n.language)}
                    <span className="wh-muted"> · {formatHours(s.duration_seconds)}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.open_session?.is_stale && <p className="wh-notice">{t('clock.stale')}</p>}

            {(data.enabled || working) && (
              <Button
                className="wh-clock-action"
                variant={working ? 'danger' : 'primary'}
                loading={busy}
                onClick={toggleClock}
              >
                {working ? t('clock.clockOut') : t('clock.clockIn')}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
