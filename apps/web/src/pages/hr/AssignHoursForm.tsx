import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import {
  hrApi,
  type AssignMode,
  type HrEmployee,
  type RoleSchedule,
  type ScheduleSource,
  type WeekDays,
} from '../../api/hr.api';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import WeekScheduleEditor from './WeekScheduleEditor';
import WeekStrip from './WeekStrip';
import { copyWeek, formatDay, formatMinutes, roleLabel, standardWeek, todayKey, weekIsValid, weekMinutes } from './hrUtils';

export type AssignTarget = HrEmployee & {
  schedule?: { source: ScheduleSource; weekly_minutes: number; days?: WeekDays | null };
};

interface Props {
  employees: AssignTarget[];
  /** Prefill for the custom editor; omitted → a sensible default is chosen. */
  initialDays?: WeekDays | null;
  initialMode?: AssignMode;
  onCancel: () => void;
  onDone: () => void;
}

const MODES: AssignMode[] = ['custom', 'role_default', 'none'];

/**
 * Assign working hours to one or many employees. Two steps: choose the hours,
 * then review a summary of exactly who gets what before anything is written —
 * the API applies it to everyone or no one.
 */
export default function AssignHoursForm({ employees, initialDays, initialMode = 'custom', onCancel, onDone }: Props) {
  const { t, i18n } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const single = employees.length === 1 ? employees[0] : null;

  const [roles, setRoles] = useState<RoleSchedule[] | null>(null);
  const [mode, setMode] = useState<AssignMode>(initialMode);
  // Starting week: what the caller passed, else the one employee's current hours.
  const [days, setDays] = useState<WeekDays | null>(() => {
    const start = initialDays ?? single?.schedule?.days ?? null;
    return start ? copyWeek(start) : null;
  });
  const [effectiveFrom, setEffectiveFrom] = useState(todayKey());
  const [note, setNote] = useState('');
  const [step, setStep] = useState<'edit' | 'confirm'>('edit');
  const [saving, setSaving] = useState(false);

  // Otherwise: a single employee opened from a table row has their schedule
  // looked up; a group starts from their shared role's default, else Mon–Fri.
  useEffect(() => {
    const needsOwn = !!single && !single.schedule && !days;
    hrApi
      .roleSchedules()
      .then((list) => {
        setRoles(list);
        if (needsOwn) return;
        const roleIds = new Set(employees.map((e) => e.role_id));
        const shared = roleIds.size === 1 ? list.find((r) => r.id === [...roleIds][0]) : undefined;
        setDays((prev) => prev ?? (shared?.days ? copyWeek(shared.days) : standardWeek()));
      })
      .catch(() => {
        setRoles([]);
        setDays((prev) => prev ?? standardWeek());
      });
    if (needsOwn) {
      hrApi
        .employee(single.id)
        .then((res) => setDays((prev) => prev ?? copyWeek(res.schedule.days ?? res.role_default.days ?? standardWeek())))
        .catch(() => setDays((prev) => prev ?? standardWeek()));
    }
    // Runs once per opening — the form is remounted for each new selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleById = useMemo(() => new Map((roles ?? []).map((r) => [r.id, r])), [roles]);

  const newWeekly = (e: AssignTarget) => {
    if (mode === 'custom') return weekMinutes(days);
    if (mode === 'none') return 0;
    return e.role_id ? (roleById.get(e.role_id)?.weekly_minutes ?? 0) : 0;
  };

  const valid = mode !== 'custom' || (!!days && weekIsValid(days));
  const customCount = employees.filter((e) => e.schedule?.source === 'custom').length;

  const handleApply = async () => {
    setSaving(true);
    try {
      const res = await hrApi.assign({
        user_ids: employees.map((e) => e.id),
        mode,
        days: mode === 'custom' ? (days ?? undefined) : undefined,
        effective_from: effectiveFrom,
        note: note.trim() || undefined,
      });
      toast.success(t('assign.success', { count: res.updated }));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(false);
    }
  };

  if (!roles || (mode === 'custom' && !days)) return <Spinner center />;

  if (step === 'confirm') {
    return (
      <div>
        <div className="wh-confirm-head">
          <strong>{t('assign.confirmTitle', { count: employees.length })}</strong>
          <span>
            {t(`assign.mode.${mode}.label`)} · {t('assign.effectiveOn', { date: formatDay(effectiveFrom, i18n.language, { year: 'numeric' }) })}
          </span>
        </div>

        {mode === 'custom' && days && (
          <div className="wh-confirm-week">
            <WeekStrip days={days} />
            <span>{t('assign.weekly', { hours: formatMinutes(weekMinutes(days)) })}</span>
          </div>
        )}

        {mode !== 'custom' && customCount > 0 && (
          <p className="wh-notice">{t('assign.replacesCustom', { count: customCount })}</p>
        )}

        <div className="wh-confirm-list">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.employee')}</th>
                <th className="hide-mobile">{t('table.role')}</th>
                <th>{t('assign.currentWeekly')}</th>
                <th>{t('assign.newWeekly')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const before = e.schedule?.weekly_minutes;
                const after = newWeekly(e);
                return (
                  <tr key={e.id}>
                    <td>{e.full_name}</td>
                    <td className="hide-mobile">{roleLabel(e, tCommon)}</td>
                    <td className="wh-muted">{before === undefined ? '—' : formatMinutes(before)}</td>
                    <td>
                      <strong>{after ? formatMinutes(after) : t('schedule.none')}</strong>
                      {mode === 'role_default' && <span className="wh-muted"> · {t('source.role')}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <Button variant="ghost" type="button" onClick={() => setStep('edit')} disabled={saving}>
            {tCommon('actions.back')}
          </Button>
          <Button type="button" onClick={handleApply} loading={saving}>
            {t('assign.apply', { count: employees.length })}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="wh-targets">
        <span>{t('assign.appliesTo', { count: employees.length })}</span>
        <div className="wh-target-chips">
          {employees.slice(0, 6).map((e) => (
            <span key={e.id} className="chip">{e.full_name}</span>
          ))}
          {employees.length > 6 && <span className="chip">+{employees.length - 6}</span>}
        </div>
      </div>

      <div className="wh-mode-grid" role="radiogroup" aria-label={t('assign.modeLabel')}>
        {MODES.map((m) => (
          <label key={m} className={`wh-mode ${mode === m ? 'is-active' : ''}`}>
            <input type="radio" name="assign-mode" checked={mode === m} onChange={() => setMode(m)} />
            <span className="wh-mode-title">{t(`assign.mode.${m}.label`)}</span>
            <span className="wh-mode-hint">{t(`assign.mode.${m}.hint`)}</span>
          </label>
        ))}
      </div>

      {mode === 'custom' && days && <WeekScheduleEditor value={days} onChange={setDays} />}

      <div className="form-row" style={{ marginTop: 16 }}>
        <div className="form-group">
          <label className="form-label" htmlFor="assign-effective">{t('assign.effectiveFrom')}</label>
          <input
            id="assign-effective"
            type="date"
            className="form-input"
            value={effectiveFrom}
            min={todayKey()}
            onChange={(e) => setEffectiveFrom(e.target.value || todayKey())}
          />
          <p className="form-hint">{t('assign.effectiveHint')}</p>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="assign-note">{t('assign.note')}</label>
          <input
            id="assign-note"
            className="form-input"
            value={note}
            maxLength={500}
            placeholder={t('assign.notePlaceholder')}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="form-actions" style={{ marginTop: 20 }}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="button" onClick={() => setStep('confirm')} disabled={!valid}>
          {t('assign.review')}
        </Button>
      </div>
    </div>
  );
}
