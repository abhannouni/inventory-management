import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { hrApi, type WorkSessionRecord } from '../../api/hr.api';
import Button from '../../components/ui/Button';
import { formatHours, toLocalInput } from './hrUtils';

interface Props {
  userId: string;
  /** Present when correcting an existing record. */
  record?: WorkSessionRecord;
  /** Prefill day for a new record, `YYYY-MM-DD`. */
  defaultDate?: string;
  onCancel: () => void;
  onDone: () => void;
}

/** Enter or correct a stretch of working time on an employee's behalf. */
export default function TimeRecordForm({ userId, record, defaultDate, onCancel, onDone }: Props) {
  const { t } = useTranslation('hr');
  const { t: tCommon } = useTranslation('common');
  const [clockIn, setClockIn] = useState(record ? toLocalInput(record.clock_in) : `${defaultDate}T09:00`);
  const [clockOut, setClockOut] = useState(
    record ? toLocalInput(record.clock_out) : `${defaultDate}T18:00`,
  );
  const [note, setNote] = useState(record?.note ?? '');
  const [saving, setSaving] = useState(false);

  const inDate = clockIn ? new Date(clockIn) : null;
  const outDate = clockOut ? new Date(clockOut) : null;
  const error =
    !inDate
      ? t('records.errors.clockInRequired')
      : outDate && outDate <= inDate
        ? t('records.errors.outBeforeIn')
        : null;
  const duration = inDate && outDate && !error ? (outDate.getTime() - inDate.getTime()) / 1000 : null;

  const submit = async () => {
    if (error || !inDate) return;
    setSaving(true);
    const payload = {
      clock_in: inDate.toISOString(),
      clock_out: outDate ? outDate.toISOString() : null,
      note: note.trim() || undefined,
    };
    try {
      if (record) await hrApi.updateSession(record.id, payload);
      else await hrApi.createSession({ user_id: userId, ...payload });
      toast.success(record ? t('records.updated') : t('records.created'));
      onDone();
    } catch (e) {
      toast.error((e as Error).message || t('errors.saveFailed'));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="rec-in">{t('records.clockIn')}</label>
          <input id="rec-in" type="datetime-local" className="form-input" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rec-out">{t('records.clockOut')}</label>
          <input
            id="rec-out"
            type="datetime-local"
            className={`form-input ${error && outDate ? 'is-error' : ''}`}
            value={clockOut}
            onChange={(e) => setClockOut(e.target.value)}
          />
          <p className="form-hint">{t('records.clockOutHint')}</p>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 12 }}>
        <label className="form-label" htmlFor="rec-note">{t('records.note')}</label>
        <input
          id="rec-note"
          className="form-input"
          value={note}
          maxLength={500}
          placeholder={t('records.notePlaceholder')}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error ? (
        <p className="form-error" style={{ marginTop: 8 }}>{error}</p>
      ) : (
        duration !== null && <p className="wh-muted" style={{ marginTop: 8 }}>{t('records.duration', { hours: formatHours(duration) })}</p>
      )}

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={saving}>
          {tCommon('actions.cancel')}
        </Button>
        <Button type="button" onClick={submit} loading={saving} disabled={!!error}>
          {tCommon('actions.save')}
        </Button>
      </div>
    </div>
  );
}
