import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import {
  fetchMinePlan,
  planVisit,
  updatePlannedVisit,
  removePlannedVisit,
  submitMinePlan,
} from '../../store/slices/visitPlansSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import {
  buildCalendarDays,
  buildMonthDays,
  sameDay,
  parseApiDay,
  formatDayHeading,
  formatDayShort,
  toYYYYMMDD,
  weekdayIndexMonFirst,
} from '../../utils/calendar';
import { chipState } from './chipState';
import PlanVisitFields from './PlanVisitFields';
import type { PlanVisitDraft } from './PlanVisitFields';
import type { PlannedVisit, VisitPlanStatus } from '../../types';

const STATUS_VARIANT: Record<VisitPlanStatus, 'gray' | 'warning' | 'success' | 'danger'> = {
  draft: 'gray',
  pending_review: 'warning',
  approved: 'success',
  declined: 'danger',
};

// ─── Entry form ─────────────────────────────────────────────────────────────

interface EntryFormProps {
  editing: PlannedVisit | null;
  stores: { id: string; name: string }[];
  /** Stores already on this day — the same POS can't be visited twice in a day. */
  takenStoreIds: string[];
  /** Hours already spoken for on this day — one visit per slot. */
  takenTimes: string[];
  otherMonthDays: number[];
  onSubmit: (data: PlanVisitDraft) => void;
  onCancel: () => void;
  loading: boolean;
}

/**
 * Editing one planned day is a different shape from adding several, so the two
 * are separate here: a single store + hour when editing, and the shared
 * point-of-sale/hour/repeat block otherwise.
 */
function EntryForm({ editing, stores, takenStoreIds, takenTimes, otherMonthDays, onSubmit, onCancel, loading }: EntryFormProps) {
  const { t } = useTranslation('planning');
  const { t: tCommon } = useTranslation('common');
  const [storeId, setStoreId] = useState(editing?.store_id ?? '');
  const [time, setTime] = useState(editing?.planned_time ?? '');
  const [notes, setNotes] = useState(editing?.planned_notes ?? '');
  const [draft, setDraft] = useState<PlanVisitDraft | null>(null);

  // A store already on this day stays selectable only when it is the one being edited.
  const isTaken = (id: string) => takenStoreIds.includes(id) && id !== editing?.store_id;
  const timeTaken = !!time && takenTimes.includes(time);
  const canSubmit = editing ? !!storeId && !!time && !timeTaken : !!draft;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (editing) {
      onSubmit({ picks: [{ store_id: storeId, time }], notes: notes || undefined });
      return;
    }
    if (draft) onSubmit(draft);
  };

  return (
    <form className="planning-entry-form" onSubmit={handleSubmit}>
      {editing ? (
        <>
          <div className="form-group">
            <label className="form-label">{t('form.store')}</label>
            <select className="form-select" value={storeId} onChange={(e) => setStoreId(e.target.value)} required autoFocus>
              <option value="">{t('form.selectStore')}</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} disabled={isTaken(s.id)}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('form.timeLabel')}</label>
            <input
              type="time"
              className="form-input"
              value={time}
              required
              onChange={(e) => setTime(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            {timeTaken && <p className="planning-adjust-error">{t('form.timeTaken')}</p>}
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('form.notesLabel')} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t('form.notesOptional')}</span>
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder={t('form.notesPlaceholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
        </>
      ) : (
        <PlanVisitFields
          stores={stores}
          takenStoreIds={takenStoreIds}
          takenTimes={takenTimes}
          otherMonthDays={otherMonthDays}
          onChange={setDraft}
        />
      )}

      <div className="modal-footer" style={{ marginTop: 8 }}>
        <Button variant="outline" type="button" onClick={onCancel}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading} disabled={!canSubmit}>
          {editing ? t('form.saveChanges') : t('form.addVisit')}
        </Button>
      </div>
    </form>
  );
}

// ─── Day detail modal content ───────────────────────────────────────────────

interface DayDetailProps {
  day: Date;
  entries: PlannedVisit[];
  stores: { id: string; name: string }[];
  otherMonthDays: number[];
  /** False for a merchandiser — their month is planned for them. */
  editable: boolean;
  onAdd: (data: PlanVisitDraft) => void;
  onEdit: (id: string, data: { store_id: string; time?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
  onNavigateDay: (delta: 1 | -1) => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  saving: boolean;
}

function DayDetail({
  day, entries, stores, otherMonthDays, editable,
  onAdd, onEdit, onDelete, onNavigateDay, canGoPrev, canGoNext, saving,
}: DayDetailProps) {
  const { t, i18n } = useTranslation('planning');
  const [formOpen, setFormOpen] = useState(editable && entries.length === 0);
  const [editing, setEditing] = useState<PlannedVisit | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const takenStoreIds = entries.map((e) => e.store_id);
  // The hour being edited stays available to the row that owns it.
  const takenTimes = entries
    .filter((e) => e.id !== editing?.id)
    .map((e) => e.planned_time)
    .filter((t): t is string => !!t);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (entry: PlannedVisit) => { setEditing(entry); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const handleSubmit = (data: PlanVisitDraft) => {
    if (editing) onEdit(editing.id, { store_id: data.picks[0].store_id, time: data.picks[0].time, notes: data.notes });
    else onAdd(data);
    closeForm();
  };

  return (
    <div className="day-detail">
      <div className="day-detail-nav">
        <button type="button" className="cal-nav-btn" disabled={!canGoPrev} onClick={() => onNavigateDay(-1)} aria-label={t('dayDetail.previousDay')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <p className="day-detail-date">{formatDayHeading(day, i18n.language)}</p>
        <button type="button" className="cal-nav-btn" disabled={!canGoNext} onClick={() => onNavigateDay(1)} aria-label={t('dayDetail.nextDay')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {entries.length === 0 && !formOpen && (
        <p className="day-detail-empty">{t('dayDetail.empty')}</p>
      )}

      {entries.length > 0 && (
        <div className="day-detail-list">
          {entries.map((entry) => {
            // Once a planned visit has been checked into it can no longer be
            // moved or dropped — it is a real visit now.
            const locked = entry.status !== 'planned';
            return (
              <motion.div key={entry.id} className="schedule-list-item" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                <div className="sli-left">
                  {entry.planned_time && <div className="sli-time">{entry.planned_time}</div>}
                  <div className="sli-store">{entry.store?.name ?? entry.store_id}</div>
                  {entry.planned_notes && <div className="sli-notes">{entry.planned_notes}</div>}
                </div>
                <div className="sli-right">
                  <Badge variant={entry.status === 'completed' ? 'success' : entry.status === 'open' ? 'primary' : 'warning'}>
                    {t(`legend.${entry.status}`)}
                  </Badge>
                  {editable && !locked && (
                    <div className="sli-actions">
                      <button className="sli-btn edit" onClick={() => openEdit(entry)} title={t('dayDetail.edit')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {confirmId === entry.id ? (
                        <div className="sli-confirm">
                          <span>{t('dayDetail.deleteConfirm')}</span>
                          <button className="sli-btn danger" onClick={() => { onDelete(entry.id); setConfirmId(null); }}>{t('dayDetail.yes')}</button>
                          <button className="sli-btn" onClick={() => setConfirmId(null)}>{t('dayDetail.no')}</button>
                        </div>
                      ) : (
                        <button className="sli-btn delete" onClick={() => setConfirmId(entry.id)} title={t('dayDetail.delete')}>
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
            );
          })}
        </div>
      )}

      {editable && (
        <AnimatePresence mode="wait">
          {formOpen ? (
            <motion.div key="form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginTop: 14, overflow: 'hidden' }}>
              <EntryForm
                editing={editing}
                stores={stores}
                takenStoreIds={takenStoreIds}
                takenTimes={takenTimes}
                otherMonthDays={otherMonthDays}
                onSubmit={handleSubmit}
                onCancel={closeForm}
                loading={saving}
              />
            </motion.div>
          ) : (
            <Button style={{ width: '100%', marginTop: 16 }} onClick={openAdd} icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            }>
              {t('dayDetail.addVisit')}
            </Button>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── Main view ───────────────────────────────────────────────────────────────

interface MyPlanningViewProps {
  /**
   * True for a supervisor, who builds and submits their own month. A
   * merchandiser gets the same calendar read-only — theirs is filled in for
   * them by a super admin.
   */
  editable: boolean;
}

export default function MyPlanningView({ editable }: MyPlanningViewProps) {
  const { t, i18n } = useTranslation('planning');
  const dispatch = useAppDispatch();
  const { mine: plan, mineLoading } = useAppSelector((s) => s.visitPlans);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    dispatch(fetchMinePlan({ year, month }));
  }, [dispatch, year, month]);

  useEffect(() => {
    if (editable) dispatch(fetchStores());
  }, [dispatch, editable]);

  const calendarDays = buildCalendarDays(year, month - 1);
  const monthDays = buildMonthDays(year, month - 1);
  const today = new Date();

  const entriesForDay = (day: Date) =>
    (plan?.visits ?? []).filter((v) => sameDay(parseApiDay(v.planned_date), day));

  /**
   * The calendar days are clickable, but that is not discoverable — this opens
   * the same day form directly, on today when the shown month contains it and
   * on the 1st otherwise.
   */
  const openAddForToday = () => {
    const isThisMonth = today.getFullYear() === year && today.getMonth() === month - 1;
    setSelectedDay(isThisMonth ? today : new Date(year, month - 1, 1));
  };

  const handlePrev = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday = () => { const now = new Date(); setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1)); };

  const handleAdd = async (day: Date, data: PlanVisitDraft) => {
    setSaving(true);
    const targetDays = [day];
    const seen = new Set([day.getDate()]);

    if (data.repeatWeekdays?.length) {
      for (const d of monthDays) {
        if (d > day && data.repeatWeekdays.includes(weekdayIndexMonFirst(d)) && !seen.has(d.getDate())) {
          targetDays.push(d);
          seen.add(d.getDate());
        }
      }
    }
    if (data.extraDays?.length) {
      for (const dayNum of data.extraDays) {
        if (seen.has(dayNum)) continue;
        const d = monthDays.find((m) => m.getDate() === dayNum);
        if (d) { targetDays.push(d); seen.add(dayNum); }
      }
    }

    const totalCombos = targetDays.length * data.picks.length;
    let successCount = 0;
    let lastError: string | undefined;
    for (const d of targetDays) {
      for (const pick of data.picks) {
        const res = await dispatch(
          planVisit({ date: toYYYYMMDD(d), store_id: pick.store_id, time: pick.time, notes: data.notes }),
        );
        if (planVisit.fulfilled.match(res)) successCount += 1;
        else lastError = res.payload as string;
      }
    }
    setSaving(false);

    if (totalCombos > 1) {
      if (successCount > 0) toast.success(t('form.bulkAdded', { count: successCount }));
      if (successCount < totalCombos) toast.error(lastError || t('toasts.addError'));
    } else if (successCount > 0) {
      toast.success(t('toasts.addSuccess'));
    } else {
      toast.error(lastError || t('toasts.addError'));
    }
  };

  const handleEdit = async (visitId: string, data: { store_id: string; time?: string; notes?: string }) => {
    setSaving(true);
    const res = await dispatch(
      // An emptied time field clears the hour rather than leaving the old one.
      updatePlannedVisit({ visitId, payload: { ...data, time: data.time ?? null } }),
    );
    setSaving(false);
    if (updatePlannedVisit.fulfilled.match(res)) toast.success(t('toasts.updateSuccess'));
    else toast.error((res.payload as string) || t('toasts.updateError'));
  };

  const handleDelete = async (visitId: string) => {
    setSaving(true);
    const res = await dispatch(removePlannedVisit(visitId));
    setSaving(false);
    if (removePlannedVisit.fulfilled.match(res)) toast.success(t('toasts.deleteSuccess'));
    else toast.error((res.payload as string) || t('toasts.deleteError'));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await dispatch(submitMinePlan({ year, month }));
    setSubmitting(false);
    if (submitMinePlan.fulfilled.match(res)) toast.success(t('toasts.submitSuccess'));
    else toast.error((res.payload as string) || t('toasts.submitError'));
  };

  const handleNavigateDay = (delta: 1 | -1) => {
    setSelectedDay((d) => {
      if (!d) return d;
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
      return next.getMonth() === d.getMonth() ? next : d;
    });
  };

  const entryCount = plan?.visits.length ?? 0;
  const chipFor = (v: PlannedVisit) => chipState(v, plan?.status);
  const canSubmit = editable && plan && (plan.status === 'draft' || plan.status === 'declined') && entryCount > 0;

  return (
    <div className="schedule-page planning-page">
      <div className="schedule-header">
        <div className="schedule-title-row">
          <div>
            <h2 className="page-title">{editable ? t('pageTitle') : t('assigned.pageTitle')}</h2>
            <p className="page-subtitle">{editable ? t('subtitle') : t('assigned.subtitle')}</p>
          </div>
          <div className="planning-header-actions">
            {editable && (
              <Button
                variant="outline"
                onClick={openAddForToday}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                {t('addVisitCta')}
              </Button>
            )}
            {canSubmit && (
              <Button onClick={handleSubmit} loading={submitting}>{t('submitForReview')}</Button>
            )}
          </div>
        </div>

        <div className="cal-month-nav">
          <button className="cal-nav-btn" onClick={handlePrev} aria-label={t('previousMonth')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="cal-month-label">
            <span className="cal-month-name">{(t('months', { returnObjects: true }) as string[])[currentDate.getMonth()]}</span>
            <span className="cal-year">{currentDate.getFullYear()}</span>
          </div>
          <button className="cal-nav-btn" onClick={handleNext} aria-label={t('nextMonth')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button className="cal-today-btn" onClick={handleToday}>{t('today')}</button>
        </div>
      </div>

      {/* Status banner */}
      <div className={`planning-status-banner status-${plan?.status ?? 'empty'}`}>
        <Badge variant={plan ? STATUS_VARIANT[plan.status] : 'gray'}>
          {plan ? t(`statusLabels.${plan.status}`) : t('statusLabels.empty')}
        </Badge>
        <span className="planning-status-text">
          {!plan && (editable ? t('statusHelp.empty') : t('assigned.statusHelp.empty'))}
          {plan?.status === 'draft' && t('statusHelp.draft')}
          {plan?.status === 'pending_review' && t('statusHelp.pendingReview')}
          {plan?.status === 'approved' && (editable ? t('statusHelp.approved') : t('assigned.statusHelp.approved'))}
          {plan?.status === 'declined' && (plan.review_note ? t('statusHelp.declinedWithNote', { note: plan.review_note }) : t('statusHelp.declined'))}
        </span>
      </div>

      {/* Desktop month grid */}
      <motion.div className="card calendar-card planning-grid-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="calendar-weekdays">
          {(t('weekdaysShort', { returnObjects: true }) as string[]).map((d, idx) => (
            <div key={idx} className="calendar-weekday">{d}</div>
          ))}
        </div>
        {mineLoading ? (
          <div className="calendar-loading">{t('calendar.loading')}</div>
        ) : (
          <div className="calendar-grid">
            {calendarDays.map((day, i) => {
              const isToday = sameDay(day, today);
              const isCurrent = day.getMonth() === currentDate.getMonth();
              const dayEntries = entriesForDay(day);
              return (
                <div
                  key={i}
                  className={`calendar-day${isToday ? ' today' : ''}${!isCurrent ? ' other-month' : ''}${dayEntries.length > 0 ? ' has-events' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  {editable && isCurrent && dayEntries.length === 0 && (
                    <span className="calendar-day-add" aria-hidden="true">+</span>
                  )}
                  <div className="day-chips">
                    {dayEntries.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        className={`visit-chip ${chipFor(e)}`}
                        title={`${e.planned_time ?? ''} ${e.store?.name ?? ''}`.trim()}
                      >
                        {e.planned_time && <span className="visit-chip-time">{e.planned_time}</span>}
                        <span className="visit-chip-store">{e.store?.name ?? t('calendar.visitFallback')}</span>
                      </span>
                    ))}
                    {dayEntries.length > 3 && (
                      <span className="visit-chip more">{t('calendar.moreCount', { count: dayEntries.length - 3 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Mobile agenda list */}
      <div className="planning-agenda-view">
        {mineLoading ? (
          <div className="calendar-loading">{t('calendar.loading')}</div>
        ) : (
          monthDays.map((day) => {
            const dayEntries = entriesForDay(day);
            const isToday = sameDay(day, today);
            return (
              <div key={day.toISOString()} className={`planning-agenda-row${isToday ? ' today' : ''}`} onClick={() => setSelectedDay(day)}>
                <div className="planning-agenda-date">
                  <span className="planning-agenda-daynum">{day.getDate()}</span>
                  <span className="planning-agenda-weekday">{formatDayShort(day, i18n.language).split(' ')[0]}</span>
                </div>
                <div className="planning-agenda-chips">
                  {dayEntries.length === 0 ? (
                    <span className="planning-agenda-empty">{t('dayDetail.empty')}</span>
                  ) : (
                    dayEntries.map((e) => (
                      <span key={e.id} className={`visit-chip ${chipFor(e)}`}>
                        {e.planned_time && <span className="visit-chip-time">{e.planned_time}</span>}
                        <span className="visit-chip-store">{e.store?.name ?? t('calendar.visitFallback')}</span>
                      </span>
                    ))
                  )}
                </div>
                <svg className="planning-agenda-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            );
          })
        )}
      </div>

      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={t('dayDetail.modalTitle')} size="sm">
        {selectedDay && (
          <DayDetail
            key={toYYYYMMDD(selectedDay)}
            day={selectedDay}
            entries={entriesForDay(selectedDay)}
            stores={stores}
            editable={editable}
            otherMonthDays={monthDays.map((d) => d.getDate()).filter((n) => n !== selectedDay.getDate())}
            onAdd={(data) => handleAdd(selectedDay, data)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onNavigateDay={handleNavigateDay}
            canGoPrev={selectedDay.getDate() > 1}
            canGoNext={selectedDay.getDate() < monthDays.length}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}
