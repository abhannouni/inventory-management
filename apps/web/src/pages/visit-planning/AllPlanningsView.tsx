import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import { addVisitsForUser, fetchAllPlanned } from '../../store/slices/visitPlansSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import SearchInput from '../../components/ui/SearchInput';
import PlanVisitFields from './PlanVisitFields';
import type { PlanVisitDraft } from './PlanVisitFields';
import { chipState } from './chipState';
import {
  buildCalendarDays,
  buildMonthDays,
  sameDay,
  parseApiDay,
  formatDayHeading,
  toYYYYMMDD,
  weekdayIndexMonFirst,
} from '../../utils/calendar';
import { visitPlansApi } from '../../api/visit-plans.api';
import type { PlannablePerson, PlannedVisitRow } from '../../api/visit-plans.api';

/** Which role's months are on screen. Merchandisers are the common case. */
type RoleFilter = 'merchandiser' | 'supervisor';

/**
 * Stable per-person colours. Indexed by the person's position in the
 * alphabetical roster, so someone keeps the same colour as the month changes.
 */
const PERSON_COLORS = 8;

function personColorIndex(people: PlannablePerson[], userId: string | undefined) {
  if (!userId) return 0;
  const idx = people.findIndex((p) => p.id === userId);
  return idx < 0 ? 0 : idx % PERSON_COLORS;
}

export default function AllPlanningsView() {
  const { t, i18n } = useTranslation('planning');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { allPlanned, people, allLoading, saving } = useAppSelector((s) => s.visitPlans);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [role, setRole] = useState<RoleFilter>('merchandiser');
  const [supervisorId, setSupervisorId] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => { dispatch(fetchStores()); }, [dispatch]);

  const reload = () => {
    dispatch(fetchAllPlanned({
      year,
      month,
      role,
      supervisor_id: supervisorId || undefined,
      user_id: userId || undefined,
      search: search || undefined,
    }));
  };

  useEffect(() => {
    dispatch(fetchAllPlanned({
      year,
      month,
      role,
      supervisor_id: supervisorId || undefined,
      user_id: userId || undefined,
      search: search || undefined,
    }));
  }, [dispatch, year, month, role, supervisorId, userId, search]);

  // The "whose team" dropdown needs supervisors even while merchandisers are on
  // screen, so it is fetched straight from the API rather than through the
  // slice — going through the slice would overwrite the calendar's own rows.
  const [supervisors, setSupervisors] = useState<PlannablePerson[]>([]);
  useEffect(() => {
    let cancelled = false;
    visitPlansApi
      .findAllPlanned({ year, month, role: 'supervisor' })
      .then((res) => { if (!cancelled) setSupervisors(res.people); })
      .catch(() => { if (!cancelled) setSupervisors([]); });
    return () => { cancelled = true; };
  }, [year, month]);

  const calendarDays = buildCalendarDays(year, month - 1);
  const monthDays = buildMonthDays(year, month - 1);
  const today = new Date();

  const visitsForDay = (day: Date) =>
    allPlanned.filter((v) => sameDay(parseApiDay(v.planned_date), day));

  const handlePrev = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const handleNext = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const handleToday = () => { const n = new Date(); setCurrentDate(new Date(n.getFullYear(), n.getMonth(), 1)); };

  /** Only the people who actually have something this month, for the legend. */
  const legend = useMemo(() => {
    const withVisits = new Set(allPlanned.map((v) => v.user_id));
    return people.filter((p) => withVisits.has(p.id));
  }, [allPlanned, people]);

  const chipClass = (v: PlannedVisitRow) =>
    `visit-chip ${chipState(v, v.plan?.status)} person-${personColorIndex(people, v.user_id)}`;

  return (
    <div className="schedule-page planning-page">
      <div className="schedule-header">
        <div className="schedule-title-row">
          <div>
            <h2 className="page-title">{t('all.pageTitle')}</h2>
            <p className="page-subtitle">{t('all.subtitle')}</p>
          </div>
          <div className="planning-header-actions">
            <Button
              onClick={() => setAddOpen(true)}
              icon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              {t('addVisitCta')}
            </Button>
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

        <div className="filter-bar">
          <div className="form-group">
            <label className="form-label">{t('filters.roleLabel')}</label>
            <div className="planning-role-toggle">
              {(['merchandiser', 'supervisor'] as RoleFilter[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`planning-role-btn${role === r ? ' active' : ''}`}
                  onClick={() => { setRole(r); setUserId(''); setSupervisorId(''); }}
                >
                  {tCommon(`roles.${r}`)}
                </button>
              ))}
            </div>
          </div>

          {role === 'merchandiser' && (
            <Select
              label={t('filters.supervisorLabel')}
              value={supervisorId}
              onChange={(e) => { setSupervisorId(e.target.value); setUserId(''); }}
              options={supervisors.map((sup) => ({ value: sup.id, label: sup.full_name }))}
              placeholder={t('filters.allSupervisors')}
              style={{ minWidth: 190 }}
            />
          )}

          <Select
            label={t('filters.personLabel')}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            options={people.map((p) => ({ value: p.id, label: p.full_name }))}
            placeholder={t('filters.allPeople')}
            style={{ minWidth: 190 }}
          />

          <div className="form-group" style={{ minWidth: 200, flex: 1, maxWidth: 300 }}>
            <label className="form-label">{t('filters.searchLabel')}</label>
            <SearchInput value={search} onChange={setSearch} placeholder={t('filters.searchPlaceholder')} />
          </div>
        </div>

        {legend.length > 0 && (
          <div className="planning-legend">
            {legend.map((p) => (
              <span key={p.id} className={`planning-legend-item person-${personColorIndex(people, p.id)}`}>
                <span className="planning-legend-dot" />
                {p.full_name}
              </span>
            ))}
          </div>
        )}
      </div>

      <motion.div className="card calendar-card planning-grid-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="calendar-weekdays">
          {(t('weekdaysShort', { returnObjects: true }) as string[]).map((d, idx) => (
            <div key={idx} className="calendar-weekday">{d}</div>
          ))}
        </div>
        {allLoading ? (
          <div className="calendar-loading">{t('calendar.loading')}</div>
        ) : (
          <div className="calendar-grid">
            {calendarDays.map((day, i) => {
              const isToday = sameDay(day, today);
              const isCurrent = day.getMonth() === currentDate.getMonth();
              const dayVisits = visitsForDay(day);
              return (
                <div
                  key={i}
                  className={`calendar-day${isToday ? ' today' : ''}${!isCurrent ? ' other-month' : ''}${dayVisits.length > 0 ? ' has-events' : ''}`}
                  onClick={() => setSelectedDay(day)}
                >
                  <span className="day-number">{day.getDate()}</span>
                  <div className="day-chips">
                    {dayVisits.slice(0, 3).map((v) => (
                      <span
                        key={v.id}
                        className={chipClass(v)}
                        title={`${v.user?.full_name ?? ''} · ${v.planned_time ?? ''} ${v.store?.name ?? ''}`.trim()}
                      >
                        {v.planned_time && <span className="visit-chip-time">{v.planned_time}</span>}
                        <span className="visit-chip-store">{v.user?.full_name ?? v.store?.name}</span>
                      </span>
                    ))}
                    {dayVisits.length > 3 && (
                      <span className="visit-chip more">{t('calendar.moreCount', { count: dayVisits.length - 3 })}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Day detail — read-only here; changes go through the add form or the review drawer. */}
      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={t('all.dayTitle')} size="sm">
        {selectedDay && (
          <div className="day-detail">
            <p className="day-detail-date">{formatDayHeading(selectedDay, i18n.language)}</p>
            {visitsForDay(selectedDay).length === 0 ? (
              <p className="day-detail-empty">{t('dayDetail.empty')}</p>
            ) : (
              <div className="day-detail-list">
                {visitsForDay(selectedDay).map((v) => (
                  <div key={v.id} className="schedule-list-item">
                    <div className="sli-left">
                      <div className="sli-time">{v.planned_time}</div>
                      <div className="sli-store">{v.store?.name ?? v.store_id}</div>
                      <div className="sli-notes">
                        {v.user?.full_name}
                        {v.user && ` · ${tCommon(`roles.${v.user.role}`)}`}
                      </div>
                    </div>
                    <span className={`visit-chip ${chipState(v, v.plan?.status)}`}>
                      <span className="visit-chip-store">{t(`statusLabels.${v.plan?.status ?? 'draft'}`)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      <AddVisitsModal
        // Remounting on open resets the form without a reset-in-effect.
        key={addOpen ? 'open' : 'closed'}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        year={year}
        month={month}
        monthDays={monthDays}
        stores={stores}
        alreadyPlanned={allPlanned}
        saving={saving}
        onSubmit={async (targetUserId, visits) => {
          const res = await dispatch(addVisitsForUser({ userId: targetUserId, payload: { visits } }));
          if (addVisitsForUser.fulfilled.match(res)) {
            toast.success(t('all.added', { count: visits.length }));
            setAddOpen(false);
            reload();
          } else {
            toast.error((res.payload as string) || t('toasts.addError'));
          }
        }}
      />
    </div>
  );
}

// ─── Add visits for a person ────────────────────────────────────────────────

interface AddVisitsModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  monthDays: Date[];
  stores: { id: string; name: string }[];
  alreadyPlanned: PlannedVisitRow[];
  saving: boolean;
  onSubmit: (userId: string, visits: { date: string; store_id: string; time: string; notes?: string }[]) => void;
}

/**
 * The reviewer's "plan for someone" form: the same point-of-sale/hour/repeat
 * block the supervisor uses, with the person and the starting day in front of it.
 *
 * The role toggle is only there to make the person list short — merchandisers
 * first, since their months are the ones a reviewer fills in.
 */
function AddVisitsModal({
  open, onClose, year, month, monthDays, stores, alreadyPlanned, saving, onSubmit,
}: AddVisitsModalProps) {
  const { t } = useTranslation('planning');
  const { t: tCommon } = useTranslation('common');

  const [role, setRole] = useState<RoleFilter>('merchandiser');
  const [roster, setRoster] = useState<PlannablePerson[]>([]);
  const [userId, setUserId] = useState('');
  // Start on today when the month on screen contains it, otherwise on the 1st.
  const [day, setDay] = useState(() => {
    const now = new Date();
    const inMonth = now.getFullYear() === year && now.getMonth() === month - 1;
    return toYYYYMMDD(inMonth ? now : new Date(year, month - 1, 1));
  });
  const [draft, setDraft] = useState<PlanVisitDraft | null>(null);

  // The roster is fetched per role so the dropdown stays short and sorted.
  // Straight from the API again: the slice belongs to the calendar behind us.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    visitPlansApi
      .findAllPlanned({ year, month, role })
      .then((res) => { if (!cancelled) setRoster(res.people); })
      .catch(() => { if (!cancelled) setRoster([]); });
    return () => { cancelled = true; };
  }, [open, role, year, month]);

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => a.full_name.localeCompare(b.full_name)),
    [roster],
  );

  const selectedDate = day ? new Date(`${day}T00:00:00`) : null;

  // What the chosen person already has on the chosen day, so the fields can
  // grey out a taken point of sale and skip a taken hour.
  const dayRows = alreadyPlanned.filter(
    (v) => v.user_id === userId && apiDay(v.planned_date) === day,
  );

  const submit = () => {
    if (!userId || !draft || !selectedDate) return;

    const targetDays = [selectedDate];
    const seen = new Set([selectedDate.getDate()]);
    if (draft.repeatWeekdays?.length) {
      for (const d of monthDays) {
        if (d > selectedDate && draft.repeatWeekdays.includes(weekdayIndexMonFirst(d)) && !seen.has(d.getDate())) {
          targetDays.push(d);
          seen.add(d.getDate());
        }
      }
    }
    if (draft.extraDays?.length) {
      for (const n of draft.extraDays) {
        if (seen.has(n)) continue;
        const d = monthDays.find((m) => m.getDate() === n);
        if (d) { targetDays.push(d); seen.add(n); }
      }
    }

    const visits = targetDays.flatMap((d) =>
      draft.picks.map((pick) => ({
        date: toYYYYMMDD(d),
        store_id: pick.store_id,
        time: pick.time,
        notes: draft.notes,
      })),
    );
    onSubmit(userId, visits);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('all.addTitle')} size="sm">
      <div className="planning-entry-form">
        <div className="form-group">
          <label className="form-label">{t('all.roleLabel')}</label>
          <div className="planning-role-toggle">
            {(['merchandiser', 'supervisor'] as RoleFilter[]).map((r) => (
              <button
                key={r}
                type="button"
                className={`planning-role-btn${role === r ? ' active' : ''}`}
                onClick={() => { setRole(r); setUserId(''); }}
              >
                {tCommon(`roles.${r}`)}
              </button>
            ))}
          </div>
          <p className="planning-repeat-hint">{t('all.roleHint')}</p>
        </div>

        <div className="form-group">
          <label className="form-label">{t('all.personLabel')}</label>
          <select className="form-select" value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">{t('all.selectPerson')}</option>
            {sortedRoster.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t('all.dayLabel')}</label>
          <input
            type="date"
            className="form-input"
            value={day}
            min={`${year}-${String(month).padStart(2, '0')}-01`}
            max={`${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>

        {userId && selectedDate && (
          <PlanVisitFields
            key={`${userId}-${day}`}
            stores={stores}
            takenStoreIds={dayRows.map((v) => v.store_id)}
            takenTimes={dayRows.map((v) => v.planned_time).filter((x): x is string => !!x)}
            otherMonthDays={monthDays.map((d) => d.getDate()).filter((n) => n !== selectedDate.getDate())}
            onChange={setDraft}
          />
        )}

        <p className="planning-repeat-hint">{t('all.autoApproved')}</p>

        <div className="modal-footer" style={{ marginTop: 8 }}>
          <Button variant="outline" type="button" onClick={onClose}>{tCommon('actions.cancel')}</Button>
          <Button type="button" loading={saving} disabled={!userId || !draft} onClick={submit}>
            {t('form.addVisit')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/** `YYYY-MM-DD` of an API date, which arrives as a full ISO timestamp. */
function apiDay(value: string) {
  return value.slice(0, 10);
}
