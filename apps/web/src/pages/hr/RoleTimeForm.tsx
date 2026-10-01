import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { hrApi, type EmployeeWithSchedule, type HrFilters, type RoleSchedule, type ScheduleDay } from '../../api/hr.api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import {
  BREAK_OPTIONS,
  STANDARD_DAY,
  formatDay,
  formatHours,
  parseDateKey,
  roleLabelOf,
  shiftSpans,
  toMinutes,
} from './hrUtils';

interface Props {
  filters: HrFilters | null;
  /** Day to prefill, `YYYY-MM-DD`. */
  defaultDate: string;
  onCancel: () => void;
  onDone: () => void;
}

/** Monday = 0 … Sunday = 6. */
const weekdayOf = (key: string) => (parseDateKey(key).getDay() + 6) % 7;

/** Add working time for the employees of one role, prefilled with that role's hours. */
export default function RoleTimeForm({ filters, defaultDate, onCancel, onDone }: Props) {
  const { t, i18n } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');

  const [roleSchedules, setRoleSchedules] = useState<RoleSchedule[] | null>(null);
  const [roleId, setRoleId] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [shift, setShift] = useState<ScheduleDay>({ ...STANDARD_DAY });
  const [employees, setEmployees] = useState<EmployeeWithSchedule[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    hrApi.roleSchedules().then(setRoleSchedules).catch((e: Error) => toast.error(e.message));
  }, []);

  // The role's own hours for the chosen weekday, or null when it has none.
  const roleDay = useMemo(() => {
    const role = roleSchedules?.find((r) => r.id === roleId);
    return role?.days?.[weekdayOf(date)] ?? null;
  }, [roleSchedules, roleId, date]);

  const pickRole = (id: string) => {
    setRoleId(id);
    setEmployees(null);
    setSelected(new Set());
    if (!id) return;
    const role = roleSchedules?.find((r) => r.id === id);
    setShift({ ...(role?.days?.[weekdayOf(date)] ?? STANDARD_DAY) });
    hrApi
      .employees({ role_id: id })
      .then((list) => {
        setEmployees(list);
        setSelected(new Set(list.map((e) => e.id)));
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const pickDate = (key: string) => {
    setDate(key);
    const role = roleSchedules?.find((r) => r.id === roleId);
    const day = role?.days?.[weekdayOf(key)];
    if (day) setShift({ ...day });
  };

  const span = toMinutes(shift.end) - toMinutes(shift.start);
  const error = !shift.start || !shift.end
    ? t('editor.errors.required')
    : span <= 0
      ? t('editor.errors.endBeforeStart')
      : shift.break_minutes >= span
        ? t('editor.errors.breakTooLong')
        : null;
  const spans = error ? [] : shiftSpans(shift);
  const seconds = error ? 0 : (span - shift.break_minutes) * 60;
  const isRoleHours =
    !!roleDay && roleDay.start === shift.start && roleDay.end === shift.end && roleDay.break_minutes === shift.break_minutes;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = !!employees?.length && selected.size === employees.length;

  const submit = async () => {
    if (error || !selected.size) return;
    setSaving(true);
    try {
      const res = await hrApi.createSessionsBulk({
        user_ids: Array.from(selected),
        spans: spans.map((s) => ({
          clock_in: new Date(`${date}T${s.start}`).toISOString(),
          clock_out: new Date(`${date}T${s.end}`).toISOString(),
        })),
        note: note.trim() || undefined,
      });
      if (res.added) toast.success(t('roleTime.added', { count: res.added, hours: formatHours(seconds) }));
      if (res.skipped.length) {
        toast.warning(
          t('roleTime.skipped', {
            count: res.skipped.length,
            names: res.skipped.map((s) => s.full_name).join(', '),
          }),
          { autoClose: 10_000 },
        );
      }
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(false);
    }
  };

  if (!roleSchedules) return <Spinner center />;

  return (
    <div className="wh-roletime">
      {/* ── 1. Who and when ── */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="rt-role">{t('roleTime.role')}</label>
          <select id="rt-role" className="form-select" value={roleId} onChange={(e) => pickRole(e.target.value)}>
            <option value="">{t('roleTime.chooseRole')}</option>
            {(filters?.roles ?? roleSchedules).map((r) => (
              <option key={r.id} value={r.id}>{roleLabelOf(r, tCommon)}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rt-date">{t('date.label')}</label>
          <input id="rt-date" type="date" className="form-input" value={date} onChange={(e) => e.target.value && pickDate(e.target.value)} />
        </div>
      </div>

      {roleId && (
        <>
          {/* ── 2. Hours ── */}
          <div className="wh-roletime-hours">
            <div className="wh-roletime-head">
              <strong>{t('roleTime.hours')}</strong>
              {roleDay ? (
                isRoleHours ? (
                  <span className="wh-tag is-current">{t('roleTime.fromRole')}</span>
                ) : (
                  <button type="button" className="wh-link" onClick={() => setShift({ ...roleDay })}>
                    {t('roleTime.resetToRole', { start: roleDay.start, end: roleDay.end })}
                  </button>
                )
              ) : (
                <span className="wh-muted">
                  {t('roleTime.noRoleHours', { day: formatDay(date, i18n.language, { day: undefined, month: undefined, weekday: 'long' }) })}
                </span>
              )}
            </div>
            <div className="wh-roletime-fields">
              <div className="form-group">
                <label className="form-label" htmlFor="rt-start">{t('editor.start')}</label>
                <input id="rt-start" type="time" className="form-input" value={shift.start} onChange={(e) => setShift({ ...shift, start: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rt-end">{t('editor.end')}</label>
                <input id="rt-end" type="time" className="form-input" value={shift.end} onChange={(e) => setShift({ ...shift, end: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="rt-break">{t('editor.break')}</label>
                <select
                  id="rt-break"
                  className="form-select"
                  value={shift.break_minutes}
                  onChange={(e) => setShift({ ...shift, break_minutes: Number(e.target.value) })}
                >
                  {BREAK_OPTIONS.map((m) => (
                    <option key={m} value={m}>{m ? t('editor.breakOption', { minutes: m }) : t('editor.noBreak')}</option>
                  ))}
                </select>
              </div>
            </div>
            {error ? (
              <p className="form-error">{error}</p>
            ) : (
              <p className="wh-roletime-preview">
                <strong>{formatHours(seconds)}</strong>
                <span className="wh-muted"> · {t('roleTime.recordedAs', { spans: spans.map((s) => `${s.start}–${s.end}`).join(' + ') })}</span>
              </p>
            )}
          </div>

          {/* ── 3. Employees ── */}
          <div className="wh-roletime-head">
            <strong>{t('roleTime.employees', { selected: selected.size, total: employees?.length ?? 0 })}</strong>
            {!!employees?.length && (
              <button
                type="button"
                className="wh-link"
                onClick={() => setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)))}
              >
                {allSelected ? t('bulk.clear') : t('roleTime.selectAll')}
              </button>
            )}
          </div>
          {!employees ? (
            <Spinner center />
          ) : employees.length === 0 ? (
            <p className="wh-muted">{t('roleTime.noEmployees')}</p>
          ) : (
            <div className="wh-roletime-list">
              {employees.map((e) => (
                <label key={e.id} className={`wh-roletime-person ${selected.has(e.id) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} />
                  <span>
                    <strong>{e.full_name}</strong>
                    <span className="wh-muted">{e.region?.name ?? e.email}</span>
                  </span>
                </label>
              ))}
            </div>
          )}

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label" htmlFor="rt-note">{t('records.note')}</label>
            <input
              id="rt-note"
              className="form-input"
              value={note}
              maxLength={500}
              placeholder={t('roleTime.notePlaceholder')}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <p className="wh-muted">{t('roleTime.overlapHint')}</p>
        </>
      )}

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="button" onClick={submit} loading={saving} disabled={!roleId || !!error || !selected.size}>
          {selected.size
            ? t('roleTime.submit', { count: selected.size, hours: formatHours(seconds) })
            : t('roleTime.submitNone')}
        </Button>
      </div>
    </div>
  );
}
