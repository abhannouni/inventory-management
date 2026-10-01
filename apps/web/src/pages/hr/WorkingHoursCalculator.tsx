import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  hrApi,
  type AttendancePolicyView,
  type PointCheck,
  type SessionVerdict,
  type WorkingHoursCalculation,
} from '../../api/hr.api';
import StatTile from '../../components/charts/StatTile';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import WorkStatusBadge from './WorkStatusBadge';
import { addDays, formatDay, formatHours, formatTime, parseDateKey, toDateKey, todayKey, weekStart } from './hrUtils';

/** Longest range the API calculates in one go. */
const MAX_RANGE_DAYS = 62;

const VERDICT_TONE: Record<SessionVerdict, 'green' | 'red' | 'orange' | 'blue' | 'gray'> = {
  verified: 'green',
  off_site: 'red',
  unverified: 'orange',
  manual: 'blue',
  not_checked: 'gray',
};

interface Props {
  employee: { id: string; full_name: string };
  /** A day inside the week to open on; defaults to today. */
  initialDate?: string;
  /** Shown when the viewer may change the employee's location rules. */
  onEditPolicy?: () => void;
}

function monthBounds(key: string, offset = 0) {
  const d = parseDateKey(key);
  const first = new Date(d.getFullYear(), d.getMonth() + offset, 1);
  const last = new Date(d.getFullYear(), d.getMonth() + offset + 1, 0);
  return { from: toDateKey(first), to: toDateKey(last) };
}

/**
 * "Calculate working hours" for one employee: their clocked time over a
 * period, each session checked against their own location rules, with their
 * visits reported beside it — never added to it.
 */
export default function WorkingHoursCalculator({ employee, initialDate, onEditPolicy }: Props) {
  const { t, i18n } = useTranslation('hr');
  const lang = i18n.language;
  const start = weekStart(initialDate ?? todayKey());
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(addDays(start, 6));
  /** The range last asked for — a new object each time, so asking again recalculates. */
  const [applied, setApplied] = useState(() => ({ from: start, to: addDays(start, 6) }));
  const [data, setData] = useState<WorkingHoursCalculation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rangeDays = from && to ? Math.round((parseDateKey(to).getTime() - parseDateKey(from).getTime()) / 86_400_000) + 1 : 0;
  const rangeError = !from || !to
    ? t('calc.errors.range')
    : to < from
      ? t('calc.errors.order')
      : rangeDays > MAX_RANGE_DAYS
        ? t('calc.errors.tooLong', { days: MAX_RANGE_DAYS })
        : null;

  // Opens on a ready result for the week; a slower earlier request never
  // overwrites a newer one.
  useEffect(() => {
    let current = true;
    hrApi
      .calculate(employee.id, applied)
      .then((res) => {
        if (!current) return;
        setData(res);
        setError(null);
      })
      .catch((e: Error) => current && setError(e.message))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [employee.id, applied]);

  const run = (range: { from: string; to: string }) => {
    setLoading(true);
    setApplied({ ...range });
  };

  const applyRange = (range: { from: string; to: string }) => {
    setFrom(range.from);
    setTo(range.to);
    run(range);
  };

  const today = todayKey();
  const thisWeek = weekStart(today);
  const quickRanges = [
    { key: 'thisWeek', range: { from: thisWeek, to: addDays(thisWeek, 6) } },
    { key: 'lastWeek', range: { from: addDays(thisWeek, -7), to: addDays(thisWeek, -1) } },
    { key: 'thisMonth', range: monthBounds(today) },
    { key: 'lastMonth', range: monthBounds(today, -1) },
  ];

  const wh = data?.working_hours;

  return (
    <div className="wh-calc">
      {/* ── Period ── */}
      <div className="wh-calc-period">
        <div className="wh-calc-dates">
          <div className="form-group">
            <label className="form-label" htmlFor="calc-from">{t('calc.from')}</label>
            <input id="calc-from" type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="calc-to">{t('calc.to')}</label>
            <input id="calc-to" type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={() => run({ from, to })} loading={loading} disabled={!!rangeError}>
            {t('calc.run')}
          </Button>
        </div>
        <div className="wh-editor-presets">
          {quickRanges.map((q) => (
            <button
              key={q.key}
              type="button"
              className={`wh-chip ${q.range.from === from && q.range.to === to ? 'is-active' : ''}`}
              onClick={() => applyRange(q.range)}
            >
              {t(`calc.range.${q.key}`)}
            </button>
          ))}
        </div>
        {rangeError && <p className="form-error">{rangeError}</p>}
      </div>

      {error && <p className="form-error">{error}</p>}
      {!data ? (
        !error && <Spinner center />
      ) : (
        <div className={`wh-stack ${loading ? 'is-loading' : ''}`}>
          <PolicySummary policy={data.policy} onEdit={onEditPolicy} />

          {/* ── Working hours ── */}
          <section>
            <div className="wh-section-head">
              <h3 className="wh-section-title">{t('calc.workingTitle')}</h3>
              <span className="wh-muted">
                {formatDay(data.from, lang, { year: 'numeric' })} – {formatDay(data.to, lang, { year: 'numeric' })}
              </span>
            </div>
            <p className="wh-muted wh-calc-explain">{t('calc.workingExplain')}</p>
            <div className="kpi-row">
              <StatTile
                label={t('calc.counted')}
                value={formatHours(wh!.counted_seconds)}
                unit={wh!.assigned_seconds ? ` / ${formatHours(wh!.assigned_seconds)}` : undefined}
                tone={wh!.remaining_seconds > 0 && wh!.assigned_seconds > 0 ? 'warning' : 'good'}
                hint={t('calc.countedHint')}
              />
              <StatTile
                label={wh!.overtime_seconds > 0 ? t('table.overtime') : t('table.remaining')}
                value={wh!.overtime_seconds > 0 ? `+${formatHours(wh!.overtime_seconds)}` : formatHours(wh!.remaining_seconds)}
              />
              <StatTile
                label={t('calc.recorded')}
                value={formatHours(wh!.recorded_seconds)}
                hint={t('calc.sessions', { count: wh!.session_count })}
              />
              <StatTile
                label={t('calc.excluded')}
                value={formatHours(wh!.excluded_seconds)}
                tone={wh!.excluded_seconds > 0 ? 'critical' : 'default'}
                hint={t('calc.excludedHint')}
              />
            </div>
            {data.policy.enabled && wh!.recorded_seconds > 0 && <Breakdown data={data} />}
          </section>

          {/* ── Visits, separately ── */}
          <section>
            <div className="wh-section-head">
              <h3 className="wh-section-title">{t('calc.visitsTitle')}</h3>
            </div>
            <p className="wh-muted wh-calc-explain">{t('calc.visitsExplain')}</p>
            <div className="kpi-row">
              <StatTile label={t('calc.visitsPerformed')} value={data.visits.performed} hint={t('calc.visitsCompleted', { count: data.visits.completed })} />
              <StatTile label={t('calc.visitTime')} value={formatHours(data.visits.total_seconds)} />
              <StatTile label={t('calc.visitsNotStarted')} value={data.visits.not_started} />
            </div>
          </section>

          {/* ── Day by day ── */}
          <section>
            <h3 className="wh-section-title">{t('detail.daily')}</h3>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('detail.day')}</th>
                    <th>{t('table.assigned')}</th>
                    <th className="hide-mobile">{t('calc.recorded')}</th>
                    <th>{t('calc.counted')}</th>
                    <th className="hide-mobile">{t('calc.excluded')}</th>
                    <th>{t('table.status')}</th>
                    <th className="hide-mobile">{t('calc.visitsCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.days.map((d) => (
                    <tr key={d.date} className={d.date === data.today ? 'wh-day-row is-today' : 'wh-day-row'}>
                      <td><strong>{formatDay(d.date, lang)}</strong></td>
                      <td className="wh-num">{formatHours(d.assigned_seconds)}</td>
                      <td className="wh-num hide-mobile">{formatHours(d.recorded_seconds)}</td>
                      <td className="wh-num"><strong>{formatHours(d.counted_seconds)}</strong></td>
                      <td className="wh-num hide-mobile">
                        {d.excluded_seconds ? <span className="wh-excluded">−{formatHours(d.excluded_seconds)}</span> : <span className="wh-muted">—</span>}
                      </td>
                      <td>
                        <WorkStatusBadge status={d.status} size="sm" label={d.is_working ? t('status.working') : undefined} />
                      </td>
                      <td className="hide-mobile wh-muted">
                        {d.visit_count ? `${d.visit_count} · ${formatHours(d.visit_seconds)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Sessions with their location checks ── */}
          <section>
            <h3 className="wh-section-title">{t('calc.sessionsTitle')}</h3>
            {data.sessions.length === 0 ? (
              <p className="wh-muted">{t('calc.noSessions')}</p>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('detail.day')}</th>
                      <th>{t('calc.time')}</th>
                      <th>{t('calc.duration')}</th>
                      <th>{t('calc.location')}</th>
                      <th className="hide-mobile">{t('calc.atClockIn')}</th>
                      <th className="hide-mobile">{t('calc.atClockOut')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sessions.map((s) => (
                      <tr key={s.id} className={s.counts ? '' : 'wh-row-excluded'}>
                        <td>{formatDay(toDateKey(new Date(s.clock_in)), lang)}</td>
                        <td className="wh-num">
                          {formatTime(s.clock_in, lang)} – {s.is_open ? t('records.now') : formatTime(s.clock_out, lang)}
                        </td>
                        <td className="wh-num">
                          {formatHours(s.seconds)}
                          {!s.counts && <span className="wh-record-src">{t('calc.notCounted')}</span>}
                        </td>
                        <td>
                          <span className={`wh-status is-sm wh-tone-${VERDICT_TONE[s.verdict]}`} title={t(`verdict.${s.verdict}.hint`)}>
                            <span className="wh-status-dot" aria-hidden="true" />
                            {t(`verdict.${s.verdict}.label`)}
                          </span>
                        </td>
                        <td className="hide-mobile"><CheckCell check={s.checks.clock_in} t={t} /></td>
                        <td className="hide-mobile"><CheckCell check={s.checks.clock_out} t={t} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ── Visit records ── */}
          {data.visit_list.length > 0 && (
            <section>
              <h3 className="wh-section-title">{t('calc.visitList')}</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('detail.day')}</th>
                      <th>{t('calc.store')}</th>
                      <th>{t('calc.time')}</th>
                      <th>{t('calc.duration')}</th>
                      <th>{t('table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.visit_list.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {formatDay(v.checkin_time ? toDateKey(new Date(v.checkin_time)) : (v.planned_date ?? data.from), lang)}
                        </td>
                        <td>{v.store.name}</td>
                        <td className="wh-num">
                          {v.checkin_time
                            ? `${formatTime(v.checkin_time, lang)} – ${v.checkout_time ? formatTime(v.checkout_time, lang) : t('records.now')}`
                            : v.planned_time
                              ? t('calc.plannedAt', { time: v.planned_time })
                              : '—'}
                        </td>
                        <td className="wh-num">{v.checkin_time ? formatHours(v.duration_seconds) : '—'}</td>
                        <td>{t(`calc.visitStatus.${v.status}`)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/** The rules the calculation applied, in one line. */
function PolicySummary({ policy, onEdit }: { policy: AttendancePolicyView; onEdit?: () => void }) {
  const { t } = useTranslation('hr');
  const places: string[] = [];
  if (policy.allow_work_locations) {
    places.push(
      policy.work_locations.length
        ? policy.work_locations.map((l) => l.name).join(', ')
        : t('policy.summary.noLocation'),
    );
  }
  if (policy.allow_visit_stores) {
    places.push(
      policy.visit_scope === 'visit_day'
        ? t('policy.summary.visitDay')
        : t('policy.summary.visitPeriod', { minutes: policy.visit_margin_minutes }),
    );
  }
  if (policy.allow_assigned_stores) places.push(t('policy.summary.assigned'));

  return (
    <div className={`wh-calc-policy ${policy.enabled ? 'is-on' : ''}`}>
      <div>
        <strong>{policy.enabled ? t('policy.summary.on') : t('policy.summary.off')}</strong>
        {policy.enabled && (
          <span className="wh-muted">
            {t('policy.summary.places', { places: places.join(' · ') })}
            {' · '}
            {policy.count_off_site ? t('policy.summary.offSiteCounted') : t('policy.summary.offSiteExcluded')}
            {' · '}
            {policy.count_unverified ? t('policy.summary.unverifiedCounted') : t('policy.summary.unverifiedExcluded')}
          </span>
        )}
        {!policy.enabled && <span className="wh-muted">{t('policy.summary.offHint')}</span>}
      </div>
      {onEdit && (
        <Button size="sm" variant="outline" onClick={onEdit}>
          {t('actions.locationRules')}
        </Button>
      )}
    </div>
  );
}

/** Stacked bar of how the recorded time splits by location verdict. */
function Breakdown({ data }: { data: WorkingHoursCalculation }) {
  const { t } = useTranslation('hr');
  const wh = data.working_hours;
  const parts: { verdict: SessionVerdict; seconds: number }[] = (
    [
      { verdict: 'verified', seconds: wh.verified_seconds },
      { verdict: 'manual', seconds: wh.manual_seconds },
      { verdict: 'unverified', seconds: wh.unverified_seconds },
      { verdict: 'off_site', seconds: wh.off_site_seconds },
    ] as const
  ).filter((p) => p.seconds > 0);

  return (
    <div className="wh-breakdown">
      <div className="wh-breakdown-bar" role="img" aria-label={t('calc.breakdown')}>
        {parts.map((p) => (
          <span
            key={p.verdict}
            className={`wh-tone-${VERDICT_TONE[p.verdict]}`}
            style={{ flexGrow: p.seconds }}
            title={`${t(`verdict.${p.verdict}.label`)} · ${formatHours(p.seconds)}`}
          />
        ))}
      </div>
      <div className="wh-breakdown-legend">
        {parts.map((p) => (
          <span key={p.verdict} className={`wh-status is-sm wh-tone-${VERDICT_TONE[p.verdict]}`}>
            <span className="wh-status-dot" aria-hidden="true" />
            {t(`verdict.${p.verdict}.label`)} · {formatHours(p.seconds)}
          </span>
        ))}
      </div>
    </div>
  );
}

function CheckCell({ check, t }: { check: PointCheck | null; t: TFunction }) {
  if (!check) return <span className="wh-muted">—</span>;
  if (check.status === 'no_position') return <span className="wh-muted">{t('calc.check.noPosition')}</span>;
  if (!check.place) return <span className="wh-excluded">{t('calc.check.nowhereValid')}</span>;
  const where = `${check.place.name} (${t(`calc.placeKind.${check.place.kind}`)})`;
  return check.status === 'at_location' ? (
    <span>✓ {where}</span>
  ) : (
    <span className="wh-excluded">
      {t('calc.check.away', { meters: formatDistance(check.place.distance_meters), place: where })}
    </span>
  );
}

function formatDistance(meters: number) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}
