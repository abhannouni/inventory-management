import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { hrApi, type RoleSchedule, type WeekDays } from '../../api/hr.api';
import Button from '../../components/ui/Button';
import WeekScheduleEditor from './WeekScheduleEditor';
import { copyWeek, standardWeek, todayKey, weekIsValid } from './hrUtils';

interface Props {
  role: RoleSchedule;
  /** Employees in this role who have their own hours and so won't follow the change. */
  customCount: number;
  onCancel: () => void;
  onDone: () => void;
}

/** Edit (or remove) the default working hours every employee of a role follows. */
export default function RoleScheduleForm({ role, customCount, onCancel, onDone }: Props) {
  const { t } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const [days, setDays] = useState<WeekDays>(() => (role.days ? copyWeek(role.days) : standardWeek()));
  const [effectiveFrom, setEffectiveFrom] = useState(todayKey());
  const [saving, setSaving] = useState<'save' | 'remove' | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const submit = async (remove: boolean) => {
    setSaving(remove ? 'remove' : 'save');
    try {
      await hrApi.setRoleSchedule(role.id, { days: remove ? null : days, effective_from: effectiveFrom });
      toast.success(remove ? t('roles.removed') : t('roles.saved'));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(null);
    }
  };

  const following = role.employee_count - customCount;

  return (
    <div>
      <p className="wh-notice is-info">
        {t('roles.appliesTo', { count: following })}
        {customCount > 0 && ` ${t('roles.customKept', { count: customCount })}`}
      </p>

      <WeekScheduleEditor value={days} onChange={setDays} disabled={!!saving} />

      <div className="form-group" style={{ marginTop: 16, maxWidth: 260 }}>
        <label className="form-label" htmlFor="role-effective">{t('assign.effectiveFrom')}</label>
        <input
          id="role-effective"
          type="date"
          className="form-input"
          value={effectiveFrom}
          min={todayKey()}
          onChange={(e) => setEffectiveFrom(e.target.value || todayKey())}
        />
      </div>

      {confirmRemove && (
        <p className="wh-notice">{t('roles.removeConfirm', { count: following })}</p>
      )}

      <div className="form-actions wh-actions-split" style={{ marginTop: 20 }}>
        {role.days ? (
          confirmRemove ? (
            <Button variant="danger" type="button" loading={saving === 'remove'} disabled={!!saving} onClick={() => submit(true)}>
              {t('roles.removeConfirmButton')}
            </Button>
          ) : (
            <Button variant="ghost" type="button" disabled={!!saving} onClick={() => setConfirmRemove(true)}>
              {t('roles.remove')}
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="wh-actions-right">
          <Button variant="ghost" type="button" onClick={onCancel} disabled={!!saving}>
            {tCommon('actions.cancel')}
          </Button>
          <Button type="button" onClick={() => submit(false)} loading={saving === 'save'} disabled={!!saving || !weekIsValid(days)}>
            {tCommon('actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
