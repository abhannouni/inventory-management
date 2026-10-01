import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { hrApi, type EmployeeHoursDetail, type WorkSessionRecord } from '../../api/hr.api';
import StatTile from '../../components/charts/StatTile';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { usePermissions } from '../../hooks/usePermissions';
import AssignHoursForm from './AssignHoursForm';
import TimeRecordForm from './TimeRecordForm';
import WeekStrip from './WeekStrip';
import WorkStatusBadge from './WorkStatusBadge';
import {
  addDays,
  formatDay,
  formatHours,
  formatMinutes,
  formatShift,
  formatTime,
  roleLabel,
  todayKey,
  weekStart,
} from './hrUtils';
import './hr.css';

/** One employee: their week day by day, time records, schedule and its history. */
export default function EmployeeHoursPage() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const { t, i18n } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const { can } = usePermissions();
  const canManage = can('hr.manage');

  const from = weekStart(params.get('from') || todayKey());
  const [data, setData] = useState<EmployeeHoursDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState(false);
  const [record, setRecord] = useState<{ record?: WorkSessionRecord; date: string } | null>(null);
  const [deleting, setDeleting] = useState<WorkSessionRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    hrApi
      .employee(id, { from, to: addDays(from, 6) })
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [id, from]);

  useEffect(load, [load]);

  const goWeek = (key: string) => setParams({ from: key }, { replace: true });

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await hrApi.removeSession(deleting.id);
      toast.success(t('records.deleted'));
      setDeleting(null);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div>
        <BackLink />
        <div className="card wh-section"><p className="form-error">{error}</p></div>
      </div>
    );
  }
  if (!data) return <Spinner center size="lg" />;

  const { employee, totals } = data;
  const isThisWeek = from === weekStart(todayKey());

  return (
    <div className="wh-stack">
      <BackLink />

      {/* ── Employee ─────────────────────────────────────────────────── */}
      <div className="card wh-section wh-profile">
        <span className="avatar wh-profile-avatar">{employee.full_name.charAt(0).toUpperCase()}</span>
        <div className="wh-profile-text">
          <h1 className="page-title">{employee.full_name}</h1>
          <div className="wh-profile-meta">
            <span>{roleLabel(employee, tCommon)}</span>
            {employee.region && <span>{employee.region.name}</span>}
            {employee.supervisor && <span>{t('detail.supervisor', { name: employee.supervisor.full_name })}</span>}
            <span>{employee.email}</span>
          </div>
        </div>
        {canManage && (
          <div className="wh-profile-actions">
            <Button variant="outline" onClick={() => setRecord({ date: isThisWeek ? todayKey() : from })}>
              {t('records.add')}
            </Button>
            <Button onClick={() => setEditSchedule(true)}>{t('actions.editSchedule')}</Button>
          </div>
        )}
      </div>

      {/* ── Week navigation + totals ─────────────────────────────────── */}
      <div className="wh-datebar">
        <div className="wh-datebar-nav">
          <button type="button" className="wh-icon-btn" onClick={() => goWeek(addDays(from, -7))} aria-label={t('date.previousWeek')}>‹</button>
          <strong className="wh-week-label">
            {formatDay(from, i18n.language, { weekday: undefined })} – {formatDay(addDays(from, 6), i18n.language, { weekday: undefined, year: 'numeric' })}
          </strong>
          <button type="button" className="wh-icon-btn" onClick={() => goWeek(addDays(from, 7))} aria-label={t('date.nextWeek')}>›</button>
          {!isThisWeek && (
            <Button size="sm" variant="outline" onClick={() => goWeek(weekStart(todayKey()))}>
              {t('date.thisWeek')}
            </Button>
          )}
        </div>
      </div>

      <div className="kpi-row">
        <StatTile label={t('detail.assignedWeek')} value={formatHours(totals.assigned_seconds)} />
        <StatTile label={t('detail.workedWeek')} value={formatHours(totals.worked_seconds)} />
        <StatTile
          label={t('table.remaining')}
          value={formatHours(totals.remaining_seconds)}
          tone={totals.remaining_seconds > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label={t('table.overtime')}
          value={totals.overtime_seconds ? `+${formatHours(totals.overtime_seconds)}` : '0h'}
        />
      </div>

      <div className="wh-detail-grid">
        {/* ── Daily breakdown ──────────────────────────────────────────── */}
        <section className="card wh-section">
          <h2 className="wh-section-title">{t('detail.daily')}</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('detail.day')}</th>
                  <th className="hide-mobile">{t('table.schedule')}</th>
                  <th>{t('table.assigned')}</th>
                  <th>{t('table.worked')}</th>
                  <th className="hide-mobile">{t('table.remaining')}</th>
                  <th className="hide-mobile">{t('table.overtime')}</th>
                  <th>{t('table.status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.days.map((d) => (
                  <DayRows
                    key={d.date}
                    day={d}
                    isToday={d.date === data.today}
                    canManage={canManage}
                    onEdit={(r) => setRecord({ record: r, date: d.date })}
                    onDelete={setDeleting}
                    onAdd={() => setRecord({ date: d.date })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="wh-stack">
          {/* ── Current schedule ─────────────────────────────────────── */}
          <section className="card wh-section">
            <div className="wh-section-head">
              <h2 className="wh-section-title">{t('detail.currentSchedule')}</h2>
              <span className={`wh-source wh-source-${data.schedule.source}`}>{t(`source.${data.schedule.source}`)}</span>
            </div>
            {data.schedule.days ? (
              <>
                <WeekStrip days={data.schedule.days} />
                <p className="wh-muted" style={{ marginTop: 8 }}>
                  {t('assign.weekly', { hours: formatMinutes(data.schedule.weekly_minutes) })}
                </p>
              </>
            ) : (
              <p className="wh-muted">{t('detail.noSchedule')}</p>
            )}
            {data.schedule.source === 'custom' && (
              <p className="wh-muted" style={{ marginTop: 8 }}>
                {data.role_default.days
                  ? t('detail.roleDefaultIs', { hours: formatMinutes(data.role_default.weekly_minutes) })
                  : t('detail.roleHasNoDefault')}
              </p>
            )}
          </section>

          {/* ── History ──────────────────────────────────────────────── */}
          <section className="card wh-section">
            <h2 className="wh-section-title">{t('history.title')}</h2>
            {data.history.length === 0 ? (
              <p className="wh-muted">{t('history.empty')}</p>
            ) : (
              <ol className="wh-history">
                {data.history.map((h) => (
                  <li key={h.id} className={`wh-history-item ${h.is_current ? 'is-current' : ''}`}>
                    <div className="wh-history-top">
                      <strong>{t(`history.kind.${h.kind}`)}</strong>
                      {h.is_current && <span className="wh-tag is-current">{t('history.current')}</span>}
                      {h.is_upcoming && <span className="wh-tag">{t('history.upcoming')}</span>}
                    </div>
                    <div className="wh-muted">
                      {t('history.from', { date: formatDay(h.effective_from, i18n.language, { year: 'numeric' }) })}
                      {h.days && h.weekly_minutes > 0 && ` · ${formatMinutes(h.weekly_minutes)}/${t('history.week')}`}
                    </div>
                    <div className="wh-muted">
                      {t('history.by', {
                        name: h.created_by?.full_name ?? '—',
                        date: formatDay(h.created_at.slice(0, 10), i18n.language, { year: 'numeric' }),
                      })}
                    </div>
                    {h.note && <div className="wh-history-note">“{h.note}”</div>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>

      <Modal open={editSchedule} onClose={() => setEditSchedule(false)} title={t('assign.titleOne', { name: employee.full_name })} size="lg">
        {editSchedule && (
          <AssignHoursForm
            employees={[{ ...employee, schedule: data.schedule }]}
            initialDays={data.schedule.days ?? data.role_default.days ?? undefined}
            onCancel={() => setEditSchedule(false)}
            onDone={() => {
              setEditSchedule(false);
              load();
            }}
          />
        )}
      </Modal>

      <Modal
        open={!!record}
        onClose={() => setRecord(null)}
        title={record?.record ? t('records.editTitle') : t('records.addTitle')}
        size="md"
      >
        {record && (
          <TimeRecordForm
            userId={employee.id}
            record={record.record}
            defaultDate={record.date}
            onCancel={() => setRecord(null)}
            onDone={() => {
              setRecord(null);
              load();
            }}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={busy}
        title={t('records.deleteTitle')}
        message={t('records.deleteMessage')}
      />
    </div>
  );
}

function BackLink() {
  const { t } = useTranslation('hr');
  return (
    <Link to="/hr" className="wh-back">
      ‹ {t('title')}
    </Link>
  );
}

interface DayRowsProps {
  day: EmployeeHoursDetail['days'][number];
  isToday: boolean;
  canManage: boolean;
  onEdit: (r: WorkSessionRecord) => void;
  onDelete: (r: WorkSessionRecord) => void;
  onAdd: () => void;
}

/** A day's summary row, plus a row listing its time records. */
function DayRows({ day, isToday, canManage, onEdit, onDelete, onAdd }: DayRowsProps) {
  const { t, i18n } = useTranslation('hr');
  return (
    <>
      <tr className={`wh-day-row ${isToday ? 'is-today' : ''}`}>
        <td>
          <strong>{formatDay(day.date, i18n.language)}</strong>
          {isToday && <span className="wh-tag is-current">{t('date.today')}</span>}
        </td>
        <td className="hide-mobile">{day.planned ? formatShift(day.planned, t) : <span className="wh-muted">{t('schedule.dayOff')}</span>}</td>
        <td className="wh-num">{formatHours(day.assigned_seconds)}</td>
        <td className="wh-num">{formatHours(day.worked_seconds)}</td>
        <td className="wh-num hide-mobile">{formatHours(day.remaining_seconds)}</td>
        <td className="wh-num hide-mobile">{day.overtime_seconds ? `+${formatHours(day.overtime_seconds)}` : '—'}</td>
        <td>
          <WorkStatusBadge status={day.status} size="sm" label={day.is_working ? t('status.working') : undefined} />
        </td>
      </tr>
      {(day.sessions.length > 0 || canManage) && (
        <tr className="wh-records-row">
          <td colSpan={7}>
            <div className="wh-records">
              {day.sessions.map((s) => (
                <span key={s.id} className={`wh-record ${s.is_stale ? 'is-stale' : ''}`} title={s.note ?? undefined}>
                  {formatTime(s.clock_in, i18n.language)} – {s.is_open ? t('records.now') : formatTime(s.clock_out, i18n.language)}
                  <span className="wh-muted"> · {formatHours(s.duration_seconds)}</span>
                  {s.source === 'manual' && <span className="wh-record-src">{t('records.manual')}</span>}
                  {s.is_stale && <span className="wh-record-src">⚠ {t('review.label')}</span>}
                  {canManage && (
                    <>
                      <button type="button" className="wh-record-btn" onClick={() => onEdit(s)} aria-label={t('records.editTitle')}>
                        ✎
                      </button>
                      <button type="button" className="wh-record-btn is-danger" onClick={() => onDelete(s)} aria-label={t('records.deleteTitle')}>
                        ✕
                      </button>
                    </>
                  )}
                </span>
              ))}
              {canManage && (
                <button type="button" className="wh-link wh-record-add" onClick={onAdd}>
                  + {t('records.add')}
                </button>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
