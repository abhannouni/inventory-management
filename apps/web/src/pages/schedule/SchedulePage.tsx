import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchSchedules, createSchedule, updateSchedule, deleteSchedule } from '../../store/slices/schedulesSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { usePermissions } from '../../hooks/usePermissions';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import type { Schedule, ScheduleStatus } from '../../types';
import type { CreateSchedulePayload, UpdateSchedulePayload } from '../../api/schedules.api';

// ─── Helpers ────────────────────────────────────────────────────────────────

const DATE_LOCALES: Record<string, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-MA' };

function toYYYYMM(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function sameDay(a: Date, b: Date) {
  return a.getDate() === b.getDate()
    && a.getMonth() === b.getMonth()
    && a.getFullYear() === b.getFullYear();
}

function buildCalendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Mon = 0
  const lastDate = new Date(year, month + 1, 0).getDate();
  const days: Date[] = [];

  for (let i = startOffset; i > 0; i--) days.push(new Date(year, month, 1 - i));
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d));
  while (days.length < 42) days.push(new Date(year, month + 1, days.length - startOffset - lastDate + 1));
  return days;
}

function formatTime(iso: string, language: string = 'fr') {
  return new Date(iso).toLocaleTimeString(DATE_LOCALES[language] || 'fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDayHeading(d: Date, language: string = 'fr') {
  return d.toLocaleDateString(DATE_LOCALES[language] || 'fr-FR', { weekday: 'long', month: 'long', day: 'numeric' });
}

function localDatetimeValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_VARIANT: Record<ScheduleStatus, 'warning' | 'success' | 'gray'> = {
  pending: 'warning',
  completed: 'success',
  cancelled: 'gray',
};

// ─── Schedule Form ───────────────────────────────────────────────────────────

interface ScheduleFormProps {
  initialDate: Date;
  editing: Schedule | null;
  merchandisers: { id: string; full_name: string }[];
  stores: { id: string; name: string }[];
  onSubmit: (data: CreateSchedulePayload | UpdateSchedulePayload) => void;
  onCancel: () => void;
  loading: boolean;
}

function ScheduleForm({ initialDate, editing, merchandisers, stores, onSubmit, onCancel, loading }: ScheduleFormProps) {
  const { t } = useTranslation('schedule');
  const { t: tCommon } = useTranslation('common');
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultDatetime = `${initialDate.getFullYear()}-${pad(initialDate.getMonth()+1)}-${pad(initialDate.getDate())}T09:00`;

  const [userId, setUserId] = useState(editing?.user_id ?? '');
  const [storeId, setStoreId] = useState(editing?.store_id ?? '');
  const [datetime, setDatetime] = useState(editing ? localDatetimeValue(editing.scheduled_at) : defaultDatetime);
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [status, setStatus] = useState<ScheduleStatus>(editing?.status ?? 'pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!datetime) return;
    const scheduled_at = new Date(datetime).toISOString();

    if (editing) {
      onSubmit({ store_id: storeId || undefined, scheduled_at, notes: notes || undefined, status });
    } else {
      if (!userId || !storeId) return;
      onSubmit({ user_id: userId, store_id: storeId, scheduled_at, notes: notes || undefined });
    }
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      {!editing && (
        <div className="form-group">
          <label className="form-label">{t('form.merchandiser')}</label>
          <select className="form-select" value={userId} onChange={e => setUserId(e.target.value)} required>
            <option value="">{t('form.selectMerchandiser')}</option>
            {merchandisers.map(u => (
              <option key={u.id} value={u.id}>{u.full_name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">{t('form.store')}</label>
        <select className="form-select" value={storeId} onChange={e => setStoreId(e.target.value)} required={!editing}>
          <option value="">{t('form.selectStore')}</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">{t('form.dateTime')}</label>
        <input
          type="datetime-local"
          className="form-input"
          value={datetime}
          onChange={e => setDatetime(e.target.value)}
          required
        />
      </div>

      {editing && (
        <div className="form-group">
          <label className="form-label">{t('form.status')}</label>
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value as ScheduleStatus)}>
            <option value="pending">{t('form.statusOptions.pending')}</option>
            <option value="completed">{t('form.statusOptions.completed')}</option>
            <option value="cancelled">{t('form.statusOptions.cancelled')}</option>
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">{t('form.notesLabel')} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t('form.notesOptional')}</span></label>
        <textarea
          className="form-input"
          rows={3}
          placeholder={t('form.notesPlaceholder')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ resize: 'vertical' }}
        />
      </div>

      <div className="modal-footer" style={{ marginTop: 8 }}>
        <Button variant="outline" type="button" onClick={onCancel}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{editing ? t('form.saveChanges') : t('form.createSchedule')}</Button>
      </div>
    </form>
  );
}

// ─── Day Detail Panel ────────────────────────────────────────────────────────

interface DayDetailProps {
  day: Date;
  schedules: Schedule[];
  canManage: boolean;
  currentUserId?: string;
  onAdd: () => void;
  onEdit: (s: Schedule) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
}

function DayDetail({ day, schedules, canManage, currentUserId, onAdd, onEdit, onDelete, onComplete }: DayDetailProps) {
  const { t, i18n } = useTranslation('schedule');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const STATUS_LABEL: Record<ScheduleStatus, string> = {
    pending: t('legend.pending'),
    completed: t('legend.completed'),
    cancelled: t('legend.cancelled'),
  };

  return (
    <div className="day-detail">
      <p className="day-detail-date">{formatDayHeading(day, i18n.language)}</p>

      {schedules.length === 0 ? (
        <p className="day-detail-empty">{t('dayDetail.empty')}</p>
      ) : (
        <div className="day-detail-list">
          {schedules.map(s => (
            <motion.div
              key={s.id}
              className="schedule-list-item"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="sli-left">
                <div className="sli-time">{formatTime(s.scheduled_at, i18n.language)}</div>
                <div className="sli-store">{s.store?.name ?? s.store_id}</div>
                <div className="sli-user">{s.user?.full_name ?? '—'}</div>
                {s.notes && <div className="sli-notes">{s.notes}</div>}
              </div>
              <div className="sli-right">
                <Badge variant={STATUS_VARIANT[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                {s.status === 'pending' && s.user_id === currentUserId && (
                  <button className="sli-btn complete" onClick={() => onComplete(s.id)} title={t('dayDetail.markComplete')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {t('dayDetail.markComplete')}
                  </button>
                )}
                {canManage && (
                  <div className="sli-actions">
                    <button className="sli-btn edit" onClick={() => onEdit(s)} title={t('dayDetail.edit')}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    {confirmId === s.id ? (
                      <div className="sli-confirm">
                        <span>{t('dayDetail.deleteConfirm')}</span>
                        <button className="sli-btn danger" onClick={() => { onDelete(s.id); setConfirmId(null); }}>{t('dayDetail.yes')}</button>
                        <button className="sli-btn" onClick={() => setConfirmId(null)}>{t('dayDetail.no')}</button>
                      </div>
                    ) : (
                      <button className="sli-btn delete" onClick={() => setConfirmId(s.id)} title={t('dayDetail.delete')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {canManage && (
        <Button
          style={{ width: '100%', marginTop: 16 }}
          onClick={onAdd}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
        >
          {t('dayDetail.addVisit')}
        </Button>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const { t } = useTranslation('schedule');
  const dispatch = useAppDispatch();
  const { items: schedules, loading } = useAppSelector(s => s.schedules);
  const { items: users } = useAppSelector(s => s.users);
  const { items: stores } = useAppSelector(s => s.stores);
  const currentUserId = useAppSelector(s => s.auth.user?.id);
  const p = usePermissions();

  const canManage = p.isSupervisor; // super_admin + admin + supervisor (not merchandiser)

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const monthStr = toYYYYMM(currentDate);

  useEffect(() => {
    dispatch(fetchSchedules({ month: monthStr }));
  }, [dispatch, monthStr]);

  useEffect(() => {
    if (canManage) {
      dispatch(fetchUsers());
      dispatch(fetchStores());
    }
  }, [dispatch, canManage]);

  const calendarDays = buildCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
  const today = new Date();

  const schedulesForDay = (day: Date) =>
    schedules.filter(s => sameDay(new Date(s.scheduled_at), day));

  const handlePrev = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const openAddForm = () => { setEditing(null); setFormOpen(true); };
  const openEditForm = (s: Schedule) => { setEditing(s); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleFormSubmit = async (data: CreateSchedulePayload | UpdateSchedulePayload) => {
    setFormLoading(true);
    if (editing) {
      const res = await dispatch(updateSchedule({ id: editing.id, payload: data as UpdateSchedulePayload }));
      if (updateSchedule.fulfilled.match(res)) {
        toast.success(t('toasts.updateSuccess'));
        closeForm();
      } else {
        toast.error((res.payload as string) || t('toasts.updateError'));
      }
    } else {
      const res = await dispatch(createSchedule(data as CreateSchedulePayload));
      if (createSchedule.fulfilled.match(res)) {
        toast.success(t('toasts.createSuccess'));
        closeForm();
      } else {
        toast.error((res.payload as string) || t('toasts.createError'));
      }
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: string) => {
    const res = await dispatch(deleteSchedule(id));
    if (deleteSchedule.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
    } else {
      toast.error((res.payload as string) || t('toasts.deleteError'));
    }
  };

  const handleComplete = async (id: string) => {
    const res = await dispatch(updateSchedule({ id, payload: { status: 'completed' } }));
    if (updateSchedule.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
    } else {
      toast.error((res.payload as string) || t('toasts.updateError'));
    }
  };

  const merchandisers = users.filter(u => u.role === 'merchandiser' || u.role === 'supervisor');

  return (
    <div className="schedule-page">
      {/* ── Header ── */}
      <div className="schedule-header">
        <div className="schedule-title-row">
          <div>
            <h1 className="page-title">{t('pageTitle')}</h1>
            <p className="page-subtitle">
              {canManage ? t('subtitleManage') : t('subtitleView')}
            </p>
          </div>
          {canManage && (
            <Button
              onClick={openAddForm}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              {t('newSchedule')}
            </Button>
          )}
        </div>

        {/* Month navigation */}
        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={handlePrev} aria-label={t('previousMonth')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="cal-month-label">
            <span className="cal-month-name">{(t('months', { returnObjects: true }) as string[])[currentDate.getMonth()]}</span>
            <span className="cal-year">{currentDate.getFullYear()}</span>
          </div>

          <button className="cal-nav-btn" onClick={handleNext} aria-label={t('nextMonth')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          <button className="cal-today-btn" onClick={handleToday}>{t('today')}</button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="cal-legend">
        <span className="cal-legend-item pending">{t('legend.pending')}</span>
        <span className="cal-legend-item completed">{t('legend.completed')}</span>
        <span className="cal-legend-item cancelled">{t('legend.cancelled')}</span>
      </div>

      {/* ── Calendar ── */}
      <motion.div
        className="card calendar-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {/* Weekday row */}
        <div className="calendar-weekdays">
          {(t('weekdaysShort', { returnObjects: true }) as string[]).map((d, idx) => (
            <div key={idx} className="calendar-weekday">{d}</div>
          ))}
        </div>

        {/* Day grid */}
        {loading ? (
          <div className="calendar-loading">{t('calendar.loading')}</div>
        ) : (
          <div className="calendar-grid">
            {calendarDays.map((day, i) => {
              const isToday = sameDay(day, today);
              const isCurrent = day.getMonth() === currentDate.getMonth();
              const isSelected = selectedDay ? sameDay(day, selectedDay) : false;
              const daySchedules = schedulesForDay(day);

              return (
                <div
                  key={i}
                  className={`calendar-day${isToday ? ' today' : ''}${!isCurrent ? ' other-month' : ''}${isSelected ? ' selected' : ''}${daySchedules.length > 0 ? ' has-events' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="day-number">{day.getDate()}</span>

                  <div className="day-chips">
                    {daySchedules.slice(0, 3).map(s => (
                      <span key={s.id} className={`schedule-chip ${s.status}`} title={`${s.store?.name} — ${s.user?.full_name}`}>
                        {s.store?.name ?? t('calendar.visitFallback')}
                      </span>
                    ))}
                    {daySchedules.length > 3 && (
                      <span className="schedule-chip more">{t('calendar.moreCount', { count: daySchedules.length - 3 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Day Detail Modal ── */}
      <AnimatePresence>
        {selectedDay && (
          <Modal
            open={!!selectedDay}
            onClose={() => setSelectedDay(null)}
            title={t('dayDetail.modalTitle')}
            size="sm"
          >
            <DayDetail
              day={selectedDay}
              schedules={schedulesForDay(selectedDay)}
              canManage={canManage}
              currentUserId={currentUserId}
              onAdd={openAddForm}
              onEdit={(s) => { openEditForm(s); }}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Add / Edit Form Modal ── */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? t('form.editTitle') : t('form.createTitle')}
        size="sm"
      >
        <ScheduleForm
          initialDate={selectedDay ?? new Date()}
          editing={editing}
          merchandisers={merchandisers}
          stores={stores}
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}
