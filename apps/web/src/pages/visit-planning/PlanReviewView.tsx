import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import {
  fetchAllPlans,
  fetchOnePlan,
  fetchPlanForUser,
  reviewPlan,
  setMonthPlan,
  clearCurrent,
} from '../../store/slices/visitPlansSlice';
import { usePermissions } from '../../hooks/usePermissions';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import SearchInput from '../../components/ui/SearchInput';
import { apiDayString, parseApiDay } from '../../utils/calendar';
import type { PlannedVisit, Role, VisitPlan, VisitPlanStatus } from '../../types';

const STATUS_VARIANT: Record<VisitPlanStatus, 'gray' | 'warning' | 'success' | 'danger'> = {
  draft: 'gray',
  pending_review: 'warning',
  approved: 'success',
  declined: 'danger',
};

/** `view` reads the month; `decline` asks for a note; `edit` rewrites the month. */
type ReviewMode = 'view' | 'decline' | 'edit';

interface EditableRow {
  key: string;
  date: string;
  store_id: string;
  time: string;
  notes: string;
  /** Already checked into — shown but not editable, and never re-sent. */
  locked: boolean;
}

function pad2(n: number) { return String(n).padStart(2, '0'); }

/** The next free hour, so adding several points of sale stays quick. */
function nextFreeTime(taken: string[]): string {
  for (let h = 8; h <= 20; h++) {
    const slot = `${pad2(h)}:00`;
    if (!taken.includes(slot)) return slot;
  }
  return '';
}

function plannedVisits(plan: VisitPlan | null): PlannedVisit[] {
  return plan?.visits ?? [];
}

function toEditable(visits: PlannedVisit[]): EditableRow[] {
  return visits.map((v) => ({
    key: v.id,
    date: apiDayString(v.planned_date),
    store_id: v.store_id,
    time: v.planned_time ?? '',
    notes: v.planned_notes ?? '',
    locked: v.status !== 'planned',
  }));
}

// ─── Drawer shell ───────────────────────────────────────────────────────────

interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Slide-over panel anchored to the inline-end edge, so the list stays visible behind it. */
function Drawer({ open, title, onClose, children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.22, ease: 'easeOut' }}
          >
            <header className="drawer-header">
              <h3 className="drawer-title">{title}</h3>
              <button type="button" className="drawer-close" onClick={onClose} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="drawer-body">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Bulk month filler ──────────────────────────────────────────────────────

interface BulkAddProps {
  year: number;
  month: number;
  stores: { id: string; name: string }[];
  onAdd: (rows: { date: string; store_id: string; time: string; notes: string }[]) => number;
}

/**
 * Fills a month in one pass instead of a row at a time: pick the points of sale,
 * pick which weekdays they repeat on (and/or single out specific dates), and
 * every combination lands on the plan at once.
 */
function BulkAdd({ year, month, stores, onAdd }: BulkAddProps) {
  const { t } = useTranslation('planning');
  const [open, setOpen] = useState(false);
  const [picks, setPicks] = useState<{ store_id: string; time: string }[]>([]);
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [days, setDays] = useState<number[]>([]);
  const [notes, setNotes] = useState('');

  const weekdayLabels = t('weekdaysShort', { returnObjects: true }) as string[];
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const toggle = (list: number[], set: (v: number[]) => void, v: number) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /** Monday=0 .. Sunday=6, matching the weekday chips. */
  const weekdayOf = (day: number) => (new Date(year, month - 1, day).getDay() + 6) % 7;

  const targetDays = monthDays.filter(
    (d) => weekdays.includes(weekdayOf(d)) || days.includes(d),
  );
  const total = targetDays.length * picks.length;

  const reset = () => { setPicks([]); setWeekdays([]); setDays([]); setNotes(''); };

  const togglePick = (id: string) =>
    setPicks((cur) =>
      cur.some((p) => p.store_id === id)
        ? cur.filter((p) => p.store_id !== id)
        : [...cur, { store_id: id, time: nextFreeTime(cur.map((p) => p.time)) }],
    );

  const setPickTime = (id: string, value: string) =>
    setPicks((cur) => cur.map((p) => (p.store_id === id ? { ...p, time: value } : p)));

  const storeName = (id: string) => stores.find((st) => st.id === id)?.name ?? id;

  /** Two points of sale claiming one hour — nobody is in two places at once. */
  const clashingTimes = (() => {
    const seen = new Set<string>();
    const clash = new Set<string>();
    for (const p of picks) {
      if (!p.time) continue;
      if (seen.has(p.time)) clash.add(p.time);
      seen.add(p.time);
    }
    return clash;
  })();

  const ready = picks.length > 0 && picks.every((p) => p.time) && clashingTimes.size === 0;

  const apply = () => {
    const rows = targetDays.flatMap((d) =>
      picks.map((pick) => ({
        date: `${year}-${pad2(month)}-${pad2(d)}`,
        store_id: pick.store_id,
        time: pick.time,
        notes,
      })),
    );
    const added = onAdd(rows);
    if (added > 0) toast.success(t('bulk.added', { count: added }));
    if (added < rows.length) toast.info(t('bulk.skipped', { count: rows.length - added }));
    reset();
    setOpen(false);
  };

  if (!open) {
    return (
      <button type="button" className="planning-bulk-open" onClick={() => setOpen(true)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {t('bulk.open')}
      </button>
    );
  }

  return (
    <div className="planning-bulk-box">
      <div className="planning-bulk-head">
        <strong>{t('bulk.title')}</strong>
        <button type="button" className="drawer-close" onClick={() => { reset(); setOpen(false); }} aria-label={t('bulk.close')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="form-group">
        <label className="form-label">{t('form.storesLabel')}</label>
        <div className="planning-store-picker">
          {stores.map((st) => (
            <button
              key={st.id}
              type="button"
              className={`planning-store-chip${picks.some((p) => p.store_id === st.id) ? ' active' : ''}`}
              onClick={() => togglePick(st.id)}
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>

      {picks.length > 0 && (
        <div className="form-group">
          <label className="form-label">{t('form.timesLabel')}</label>
          <div className="planning-pick-list">
            {picks.map((pick) => (
              <div
                key={pick.store_id}
                className={`planning-pick-row${pick.time && clashingTimes.has(pick.time) ? ' clash' : ''}`}
              >
                <span className="planning-pick-store">{storeName(pick.store_id)}</span>
                <input
                  type="time"
                  className="form-input"
                  value={pick.time}
                  onChange={(e) => setPickTime(pick.store_id, e.target.value)}
                />
                <button type="button" className="sli-btn delete" onClick={() => togglePick(pick.store_id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {clashingTimes.size > 0 && <p className="planning-adjust-error">{t('form.timeClash')}</p>}
          <p className="planning-repeat-hint">{t('form.timesHint')}</p>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">{t('bulk.weekdaysLabel')}</label>
        <div className="planning-weekday-picker">
          {weekdayLabels.map((label, idx) => (
            <button
              key={idx}
              type="button"
              className={`planning-weekday-chip${weekdays.includes(idx) ? ' active' : ''}`}
              onClick={() => toggle(weekdays, setWeekdays, idx)}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="planning-repeat-hint">{t('bulk.weekdaysHint')}</p>
      </div>

      <div className="form-group">
        <label className="form-label">{t('bulk.daysLabel')}</label>
        <div className="planning-day-picker">
          {monthDays.map((d) => (
            <button
              key={d}
              type="button"
              className={`planning-day-chip${days.includes(d) ? ' active' : ''}`}
              onClick={() => toggle(days, setDays, d)}
            >
              {d}
            </button>
          ))}
        </div>
        <p className="planning-repeat-hint">{t('bulk.daysHint')}</p>
      </div>

      <div className="planning-bulk-row">
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">{t('form.notesLabel')}</label>
          <input
            type="text"
            className="form-input"
            placeholder={t('form.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="planning-bulk-foot">
        <span className="planning-bulk-count">{t('bulk.preview', { count: total })}</span>
        <Button type="button" size="sm" disabled={!ready || total === 0} onClick={apply}>{t('bulk.apply')}</Button>
      </div>
    </div>
  );
}

// ─── Drawer contents ────────────────────────────────────────────────────────

interface PlanDetailProps {
  plan: VisitPlan | null;
  owner: { id: string; full_name: string; email: string; role: Role };
  year: number;
  month: number;
  stores: { id: string; name: string }[];
  canReview: boolean;
  initialMode: ReviewMode;
  onApprove: () => void;
  onDecline: (note?: string) => void;
  onSave: (visits: { date: string; store_id: string; time?: string; notes?: string }[], note?: string) => void;
  saving: boolean;
}

function PlanDetail({
  plan, owner, year, month, stores, canReview, initialMode,
  onApprove, onDecline, onSave, saving,
}: PlanDetailProps) {
  const { t } = useTranslation('planning');
  const { t: tCommon } = useTranslation('common');
  const entries = plannedVisits(plan);
  // With nothing planned yet there is nothing to read — open straight into the editor.
  const [mode, setMode] = useState<ReviewMode>(entries.length === 0 && canReview ? 'edit' : initialMode);
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<EditableRow[]>(() => toEditable(entries));

  const startEdit = () => { setRows(toEditable(entries)); setMode('edit'); };

  const updateRow = (key: string, patch: Partial<EditableRow>) =>
    setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const removeRow = (key: string) => setRows((r) => r.filter((row) => row.key !== key));

  /** Appends bulk-generated rows, dropping any day/POS the month already holds. */
  const addBulkRows = (incoming: { date: string; store_id: string; time: string; notes: string }[]) => {
    let added = 0;
    setRows((r) => {
      const taken = new Set(r.map((row) => `${row.date}__${row.store_id}`));
      const fresh: EditableRow[] = [];
      incoming.forEach((row, i) => {
        const key = `${row.date}__${row.store_id}`;
        if (taken.has(key)) return;
        taken.add(key);
        fresh.push({ key: `bulk-${Date.now()}-${i}`, ...row, locked: false });
      });
      added = fresh.length;
      return [...r, ...fresh].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    });
    return added;
  };

  const addRow = () =>
    setRows((r) => [
      ...r,
      { key: `new-${Date.now()}-${r.length}`, date: `${year}-${pad2(month)}-01`, store_id: '', time: '', notes: '', locked: false },
    ]);

  /**
   * Local mirror of the two server rules: one visit per point of sale per day,
   * and one visit per time slot.
   */
  const duplicateKeys = (() => {
    const byStore = new Set<string>();
    const bySlot = new Set<string>();
    const dupes = new Set<string>();
    for (const r of rows) {
      if (!r.date || !r.store_id) continue;
      const storeKey = `${r.date}__${r.store_id}`;
      if (byStore.has(storeKey)) dupes.add(r.key);
      byStore.add(storeKey);

      if (!r.time) continue;
      const slotKey = `${r.date}__${r.time}`;
      if (bySlot.has(slotKey)) dupes.add(r.key);
      bySlot.add(slotKey);
    }
    return dupes;
  })();

  /** Every row needs an hour before the month can be saved. */
  const missingTime = rows.some((r) => !r.locked && r.date && r.store_id && !r.time);

  const submitEdit = () => {
    if (duplicateKeys.size > 0) {
      toast.error(t('detail.duplicateDay'));
      return;
    }
    if (missingTime) {
      toast.error(t('detail.missingTime'));
      return;
    }
    // Locked rows are already-started visits — the server keeps them either way.
    const clean = rows.filter((r) => !r.locked && r.date && r.store_id);
    onSave(
      clean.map((r) => ({
        date: r.date,
        store_id: r.store_id,
        time: r.time || undefined,
        notes: r.notes || undefined,
      })),
      note || undefined,
    );
  };

  return (
    <div className="planning-detail">
      <div className="planning-detail-meta">
        <div>
          <strong>{owner.full_name}</strong>
          <span className="planning-detail-email">{owner.email}</span>
        </div>
        <div className="planning-detail-badges">
          <Badge variant="gray">{tCommon(`roles.${owner.role}`)}</Badge>
          <Badge variant={plan ? STATUS_VARIANT[plan.status] : 'gray'}>
            {plan ? t(`statusLabels.${plan.status}`) : t('statusLabels.empty')}
          </Badge>
        </div>
      </div>
      <p className="planning-detail-period">{month}/{year}</p>

      {plan?.review_note && mode === 'view' && (
        <p className="planning-detail-note">{t('detail.previousNote')}: {plan.review_note}</p>
      )}

      {mode !== 'edit' && (
        <div className="day-detail-list" style={{ marginTop: 12 }}>
          {entries.length === 0 && <p className="day-detail-empty">{t('dayDetail.empty')}</p>}
          {entries.map((entry) => (
            <div key={entry.id} className="schedule-list-item">
              <div className="sli-left">
                <div className="sli-time">
                  {parseApiDay(entry.planned_date).toLocaleDateString()}
                  {entry.planned_time && ` · ${entry.planned_time}`}
                </div>
                <div className="sli-store">{entry.store?.name ?? entry.store_id}</div>
                {entry.planned_notes && <div className="sli-notes">{entry.planned_notes}</div>}
              </div>
              <Badge variant={entry.status === 'completed' ? 'success' : entry.status === 'open' ? 'primary' : 'warning'}>
                {t(`legend.${entry.status}`)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {mode === 'edit' && (
        <div className="planning-adjust-rows">
          <BulkAdd year={year} month={month} stores={stores} onAdd={addBulkRows} />
          {rows.map((row) => (
            <div key={row.key} className={`planning-adjust-row${duplicateKeys.has(row.key) ? ' duplicate' : ''}`}>
              <input
                type="date"
                className="form-input"
                value={row.date}
                disabled={row.locked}
                min={`${year}-${pad2(month)}-01`}
                max={`${year}-${pad2(month)}-${new Date(year, month, 0).getDate()}`}
                onChange={(e) => updateRow(row.key, { date: e.target.value })}
              />
              <select
                className="form-select"
                value={row.store_id}
                disabled={row.locked}
                onChange={(e) => updateRow(row.key, { store_id: e.target.value })}
              >
                <option value="">{t('form.selectStore')}</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="time"
                className="form-input"
                value={row.time}
                disabled={row.locked}
                onChange={(e) => updateRow(row.key, { time: e.target.value })}
              />
              <input
                type="text"
                className="form-input"
                placeholder={t('form.notesPlaceholder')}
                value={row.notes}
                disabled={row.locked}
                onChange={(e) => updateRow(row.key, { notes: e.target.value })}
              />
              {row.locked ? (
                <span className="planning-adjust-locked" title={t('detail.lockedHint')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                </span>
              ) : (
                <button type="button" className="sli-btn delete" onClick={() => removeRow(row.key)} title={t('dayDetail.delete')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          {duplicateKeys.size > 0 && <p className="planning-adjust-error">{t('detail.duplicateDay')}</p>}
          {missingTime && <p className="planning-adjust-error">{t('detail.missingTime')}</p>}
          <Button variant="outline" size="sm" type="button" onClick={addRow}>{t('dayDetail.addVisit')}</Button>
        </div>
      )}

      {(mode === 'decline' || mode === 'edit') && (
        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">
            {t('detail.noteLabel')} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t('form.notesOptional')}</span>
          </label>
          <textarea
            className="form-input"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === 'decline' ? t('detail.declineNotePlaceholder') : t('detail.adjustNotePlaceholder')}
          />
        </div>
      )}

      {canReview && (
        <div className="drawer-footer">
          {mode === 'view' && (
            <>
              <Button variant="outline" onClick={startEdit}>
                {entries.length === 0 ? t('detail.planMonth') : t('detail.adjust')}
              </Button>
              {plan?.status === 'pending_review' && (
                <>
                  <Button variant="outline" onClick={() => setMode('decline')}>{t('detail.decline')}</Button>
                  <Button onClick={onApprove} loading={saving}>{t('detail.approve')}</Button>
                </>
              )}
            </>
          )}
          {mode === 'decline' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')}>{tCommon('actions.cancel')}</Button>
              <Button variant="danger" onClick={() => onDecline(note || undefined)} loading={saving}>{t('detail.confirmDecline')}</Button>
            </>
          )}
          {mode === 'edit' && (
            <>
              <Button variant="outline" onClick={() => setMode('view')}>{tCommon('actions.cancel')}</Button>
              <Button onClick={submitEdit} loading={saving}>{t('detail.confirmAdjust')}</Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main review tab ─────────────────────────────────────────────────────────

export default function PlanReviewView() {
  const { t } = useTranslation('planning');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const { plans, missing, listLoading, current, currentUser, saving } = useAppSelector((s) => s.visitPlans);
  const { items: stores } = useAppSelector((s) => s.stores);

  const now = new Date();
  const [status, setStatus] = useState<VisitPlanStatus | ''>('');
  const [role, setRole] = useState<'supervisor' | 'merchandiser' | ''>('');
  const [monthValue, setMonthValue] = useState(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}`);
  const [search, setSearch] = useState('');
  // A notification deep-links to `?planId=…` / `?userId=…`; the drawer opens on
  // the first render from the URL rather than from an effect.
  const [drawerOpen, setDrawerOpen] = useState(
    () => !!(searchParams.get('planId') || searchParams.get('userId')),
  );
  const [drawerMode, setDrawerMode] = useState<ReviewMode>('view');
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const [year, month] = monthValue.split('-').map(Number);
  const canReview = p.can('visit_plans.review');

  useEffect(() => { dispatch(fetchStores()); }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAllPlans({
      status: status || undefined,
      role: role || undefined,
      year,
      month,
      search: search || undefined,
    }));
  }, [dispatch, status, role, year, month, search]);

  // Load whatever the deep link pointed at, once.
  useEffect(() => {
    const planId = searchParams.get('planId');
    const userId = searchParams.get('userId');
    if (planId) dispatch(fetchOnePlan(planId));
    else if (userId) dispatch(fetchPlanForUser({ userId, year, month }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeDrawer = () => {
    setDrawerOpen(false);
    dispatch(clearCurrent());
    if (searchParams.get('planId') || searchParams.get('userId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('planId');
      next.delete('userId');
      setSearchParams(next, { replace: true });
    }
  };

  const openPlan = (plan: VisitPlan, mode: ReviewMode = 'view') => {
    dispatch(fetchOnePlan(plan.id));
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  /** Opens someone with nothing planned yet, straight into the editor. */
  const openUser = (userId: string) => {
    dispatch(fetchPlanForUser({ userId, year, month }));
    setDrawerMode('edit');
    setDrawerOpen(true);
  };

  const refresh = () =>
    dispatch(fetchAllPlans({
      status: status || undefined,
      role: role || undefined,
      year,
      month,
      search: search || undefined,
    }));

  const handleApprove = async () => {
    if (!current) return;
    const res = await dispatch(reviewPlan({ id: current.id, payload: { action: 'approve' } }));
    if (reviewPlan.fulfilled.match(res)) { toast.success(t('toasts.approveSuccess')); closeDrawer(); }
    else toast.error((res.payload as string) || t('toasts.reviewError'));
  };

  const handleQuickApprove = async (planId: string) => {
    setApprovingId(planId);
    const res = await dispatch(reviewPlan({ id: planId, payload: { action: 'approve' } }));
    setApprovingId(null);
    setConfirmApproveId(null);
    if (reviewPlan.fulfilled.match(res)) toast.success(t('toasts.approveSuccess'));
    else toast.error((res.payload as string) || t('toasts.reviewError'));
  };

  const handleDecline = async (note?: string) => {
    if (!current) return;
    const res = await dispatch(reviewPlan({ id: current.id, payload: { action: 'decline', note } }));
    if (reviewPlan.fulfilled.match(res)) { toast.success(t('toasts.declineSuccess')); closeDrawer(); }
    else toast.error((res.payload as string) || t('toasts.reviewError'));
  };

  const handleSave = async (visits: { date: string; store_id: string; time?: string; notes?: string }[], note?: string) => {
    if (!currentUser) return;
    const res = await dispatch(setMonthPlan({ userId: currentUser.id, payload: { year, month, visits, note } }));
    if (setMonthPlan.fulfilled.match(res)) {
      toast.success(t('toasts.adjustSuccess'));
      closeDrawer();
      refresh();
    } else {
      toast.error((res.payload as string) || t('toasts.reviewError'));
    }
  };

  const columns: Column<VisitPlan>[] = [
    { key: 'user', header: t('table.owner'), render: (row) => row.user?.full_name ?? '—' },
    {
      key: 'role',
      header: t('table.role'),
      render: (row) => (row.user ? <Badge variant="gray">{tCommon(`roles.${row.user.role}`)}</Badge> : '—'),
    },
    { key: 'month', header: t('table.month'), render: (row) => `${row.month}/${row.year}` },
    { key: 'status', header: t('table.status'), render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{t(`statusLabels.${row.status}`)}</Badge> },
    { key: 'visits', header: t('table.visits'), render: (row) => plannedVisits(row).length },
    {
      key: 'submitted_at',
      header: t('table.submitted'),
      render: (row) => (row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '—'),
    },
    {
      key: 'actions',
      header: t('table.actions'),
      render: (row) => {
        if (!canReview) {
          return <Button size="sm" variant="outline" onClick={() => openPlan(row)}>{t('table.view')}</Button>;
        }
        if (row.status !== 'pending_review') {
          return (
            <div className="planning-row-actions">
              <Button size="sm" variant="outline" onClick={() => openPlan(row)}>{t('table.view')}</Button>
              <button className="sli-btn edit" title={t('detail.adjust')} onClick={() => openPlan(row, 'edit')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
            </div>
          );
        }
        if (confirmApproveId === row.id) {
          return (
            <div className="sli-confirm">
              <span>{t('table.confirmApprove')}</span>
              <button className="sli-btn danger" onClick={() => handleQuickApprove(row.id)} disabled={approvingId === row.id}>{t('dayDetail.yes')}</button>
              <button className="sli-btn" onClick={() => setConfirmApproveId(null)}>{t('dayDetail.no')}</button>
            </div>
          );
        }
        return (
          <div className="planning-row-actions">
            <button className="sli-btn complete" title={t('detail.approve')} onClick={() => setConfirmApproveId(row.id)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              {t('detail.approve')}
            </button>
            <button className="sli-btn delete" title={t('detail.decline')} onClick={() => openPlan(row, 'decline')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
            <button className="sli-btn edit" title={t('detail.adjust')} onClick={() => openPlan(row, 'edit')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="schedule-page planning-page">
      <div className="schedule-header">
        <div className="schedule-title-row">
          <div>
            <h2 className="page-title">{t('adminPageTitle')}</h2>
            <p className="page-subtitle">{t('adminSubtitle')}</p>
          </div>
        </div>

        <div className="filter-bar">
          <Input type="month" label={t('filters.monthLabel')} value={monthValue} onChange={(e) => setMonthValue(e.target.value)} style={{ minWidth: 160 }} />
          <Select
            label={t('filters.roleLabel')}
            value={role}
            onChange={(e) => setRole(e.target.value as 'supervisor' | 'merchandiser' | '')}
            options={[
              { value: 'supervisor', label: tCommon('roles.supervisor') },
              { value: 'merchandiser', label: tCommon('roles.merchandiser') },
            ]}
            placeholder={t('filters.allRoles')}
            style={{ minWidth: 170 }}
          />
          <Select
            label={t('filters.statusLabel')}
            value={status}
            onChange={(e) => setStatus(e.target.value as VisitPlanStatus | '')}
            options={[
              { value: 'pending_review', label: t('statusLabels.pending_review') },
              { value: 'approved', label: t('statusLabels.approved') },
              { value: 'declined', label: t('statusLabels.declined') },
              { value: 'draft', label: t('statusLabels.draft') },
            ]}
            placeholder={t('filters.allStatuses')}
            style={{ minWidth: 180 }}
          />
          <div className="form-group" style={{ minWidth: 220, flex: 1, maxWidth: 320 }}>
            <label className="form-label">{t('filters.searchLabel')}</label>
            <SearchInput value={search} onChange={setSearch} placeholder={t('filters.searchPlaceholder')} />
          </div>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="planning-missing-panel">
          <strong>{t('missing.title', { count: missing.length })}</strong>
          <p className="planning-missing-hint">{t('missing.hint')}</p>
          <div className="planning-missing-list">
            {missing.map((u) => (
              <button key={u.id} type="button" className="planning-missing-chip" onClick={() => openUser(u.id)}>
                {u.full_name}
                <span className="planning-missing-role">{tCommon(`roles.${u.role}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={plans}
        loading={listLoading}
        keyExtractor={(row) => row.id}
        emptyMessage={t('table.empty')}
      />

      <Drawer open={drawerOpen} title={t('detail.title')} onClose={closeDrawer}>
        {currentUser ? (
          <PlanDetail
            key={`${currentUser.id}-${current?.id ?? 'new'}`}
            plan={current}
            owner={currentUser}
            year={year}
            month={month}
            stores={stores}
            canReview={canReview}
            initialMode={drawerMode}
            onApprove={handleApprove}
            onDecline={handleDecline}
            onSave={handleSave}
            saving={saving}
          />
        ) : (
          <p className="day-detail-empty">{t('calendar.loading')}</p>
        )}
      </Drawer>
    </div>
  );
}
