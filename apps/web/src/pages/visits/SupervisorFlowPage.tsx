import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { checkin, checkout, submitVisitReport, fetchVisits, fetchActiveVisit } from '../../store/slices/visitsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchSchedules } from '../../store/slices/schedulesSlice';
import VisitTimer from '../../components/ui/VisitTimer';
import ReportCard from './ReportCard';
import type { ReportCardLabels } from './ReportCard';
import { formatDate } from '../../utils/format';
import { getCurrentPosition, geolocationErrorMessage } from '../../utils/geolocation';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import type { Visit, VisitReportCategory } from '../../types';

/* ─────────── Types ─────────── */

/** Client-side state for one report card, before it's been saved to the server. */
interface CardState {
  key: number;
  category: VisitReportCategory | null;
  note: string;
  photos: string[];
}
type Step = 'checkin' | 'report' | 'confirm' | 'done';

/* ─────────── Schedule grouping (for the expanded visits panel) ─────────── */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function groupSchedulesByDate<T extends { scheduled_at: string }>(
  schedules: T[],
  labels: { today: string; tomorrow: string; thisWeek: string; later: string },
): { label: string; items: T[] }[] {
  const today = startOfDay(new Date());
  const tomorrow = today + 86_400_000;
  const weekEnd = today + 7 * 86_400_000;

  const buckets: { label: string; items: T[] }[] = [
    { label: labels.today, items: [] },
    { label: labels.tomorrow, items: [] },
    { label: labels.thisWeek, items: [] },
    { label: labels.later, items: [] },
  ];

  for (const sch of schedules) {
    const day = startOfDay(new Date(sch.scheduled_at));
    if (day === today) buckets[0].items.push(sch);
    else if (day === tomorrow) buckets[1].items.push(sch);
    else if (day < weekEnd) buckets[2].items.push(sch);
    else buckets[3].items.push(sch);
  }

  return buckets.filter((b) => b.items.length > 0);
}

/* ─────────── Sub-components ─────────── */
function StepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation('visits');
  const steps: { id: Step; label: string }[] = [
    { id: 'checkin', label: t('supervisorFlow.steps.checkin') },
    { id: 'report',  label: t('supervisorFlow.steps.report') },
    { id: 'confirm', label: t('supervisorFlow.steps.checkout') },
  ];
  const idx = ['checkin', 'report', 'confirm', 'done'].indexOf(current);
  return (
    <div className="mf-steps">
      {steps.map((s, i) => {
        const done   = idx > i;
        const active = idx === i;
        return (
          <div key={s.id} className={`mf-step ${done ? 'done' : active ? 'active' : ''}`}>
            <div className="mf-step-circle">
              {done ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <span className="mf-step-label">{s.label}</span>
            {i < steps.length - 1 && <div className={`mf-step-line ${done ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────── Main Page ─────────── */
interface SupervisorFlowPageProps {
  /** See MerchandiserFlowPage — this is always rendered as the "visit" tab. */
  onViewHistory?: () => void;
}

export default function SupervisorFlowPage({ onViewHistory }: SupervisorFlowPageProps) {
  const { t, i18n } = useTranslation('visits');
  // Super_admin-controlled — see the Settings page. Defaults to required
  // (fail-safe) until the flag's real state loads.
  const gpsRequired = useFeatureFlag('visits.gps_required', true);
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { active: activeVisit } = useAppSelector((s) => s.visits);
  const { items: stores  } = useAppSelector((s) => s.stores);
  const { items: schedules } = useAppSelector((s) => s.schedules);
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const [step, setStep]           = useState<Step>('checkin');
  const [storeId, setStoreId]     = useState('');
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [storeErr, setStoreErr]   = useState('');
  const [busy, setBusy]           = useState(false);
  const [visitsExpanded, setVisitsExpanded] = useState(false);

  const [visit, setVisit] = useState<Visit | null>(null);

  const nextCardKey = useRef(0);
  const blankCard = (): CardState => ({ key: nextCardKey.current++, category: null, note: '', photos: [] });
  const [cards, setCards] = useState<CardState[]>(() => [blankCard()]);

  /* Load stores + ask the server whether a visit is already running */
  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchVisits());
    dispatch(fetchActiveVisit());
    if (currentUserId) dispatch(fetchSchedules({ status: 'pending', user_id: currentUserId }));
  }, [dispatch, currentUserId]);

  const upcomingSchedules = [...schedules].sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const COLLAPSED_COUNT = 3;
  const hasMoreSchedules = upcomingSchedules.length > COLLAPSED_COUNT;
  const scheduleGroups = visitsExpanded
    ? groupSchedulesByDate(upcomingSchedules, {
        today: t('merchandiserFlow.checkin.groups.today'),
        tomorrow: t('merchandiserFlow.checkin.groups.tomorrow'),
        thisWeek: t('merchandiserFlow.checkin.groups.thisWeek'),
        later: t('merchandiserFlow.checkin.groups.later'),
      })
    : [];

  /* Resume an in-progress visit after a refresh, a re-login, or a switch of device. */
  useEffect(() => {
    if (activeVisit && step === 'checkin') {
      setVisit(activeVisit);
      setStoreId(activeVisit.store_id);
      if (activeVisit.report_cards && activeVisit.report_cards.length > 0) {
        setCards(activeVisit.report_cards.map((c) => ({
          key: nextCardKey.current++,
          category: c.category,
          note: c.note ?? '',
          photos: c.photos,
        })));
        setStep('confirm');
      } else {
        setCards([blankCard()]);
        setStep('report');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisit]);

  /* ── Step 1: Check In ── */
  const handleCheckin = async () => {
    if (!storeId) { setStoreErr(t('merchandiserFlow.checkin.errors.storeRequired')); return; }
    if (gpsRequired && (!selectedStore?.latitude || !selectedStore?.longitude)) {
      setStoreErr(t('merchandiserFlow.checkin.errors.noGpsCoordinates'));
      return;
    }
    setStoreErr('');
    setBusy(true);

    let position: { lat?: number; lng?: number } = {};
    if (gpsRequired) {
      // The user's real device GPS is sent — the server checks it is within
      // the store's zone. Sending the store's own coordinates would defeat it.
      try {
        position = await getCurrentPosition();
      } catch (err) {
        setStoreErr(geolocationErrorMessage(err, t));
        setBusy(false);
        return;
      }
    }
    // The server starts the clock — no client timestamp is sent.
    const res = await dispatch(checkin({
      store_id: storeId,
      schedule_id: scheduleId ?? undefined,
      lat: position.lat,
      lng: position.lng,
    }));
    setBusy(false);
    if (checkin.fulfilled.match(res)) {
      setVisit(res.payload as Visit);
      toast.success(t('merchandiserFlow.checkin.toasts.checkedIn'));
      setStep('report');
    } else {
      toast.error((res.payload as string) || t('merchandiserFlow.checkin.toasts.checkinFailed'));
    }
  };

  /* ── Step 2: Report (repeatable cards) ── */
  const addCard = () => setCards((prev) => [...prev, blankCard()]);
  const removeCard = (key: number) => setCards((prev) => prev.filter((c) => c.key !== key));
  const updateCard = (key: number, patch: Partial<CardState>) =>
    setCards((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const canSaveReport = cards.every((c) => c.photos.length > 0 && c.category !== null);

  const reportCardLabels: ReportCardLabels = {
    cardTitle: t('supervisorFlow.report.cardTitle'),
    photoLabel: t('supervisorFlow.report.photoLabel'),
    takePhoto: t('supervisorFlow.report.takePhoto'),
    addPhoto: t('supervisorFlow.report.addPhoto'),
    removePhoto: t('supervisorFlow.report.removePhoto'),
    photoAlt: t('supervisorFlow.report.photoAlt'),
    uploading: t('supervisorFlow.report.uploading'),
    categoryLabel: t('supervisorFlow.report.categoryLabel'),
    categoryOptions: {
      display: t('supervisorFlow.report.categoryOptions.display'),
      tg: t('supervisorFlow.report.categoryOptions.tg'),
      mea: t('supervisorFlow.report.categoryOptions.mea'),
      plv: t('supervisorFlow.report.categoryOptions.plv'),
    },
    noteLabel: t('supervisorFlow.report.noteLabel'),
    notePlaceholder: t('supervisorFlow.report.notePlaceholder'),
    removeCard: t('supervisorFlow.report.removeCard'),
    fileTooLarge: t('supervisorFlow.report.toasts.fileTooLarge'),
    uploadFailed: t('supervisorFlow.report.toasts.uploadFailed'),
  };

  const handleSaveReport = async () => {
    if (!visit || !canSaveReport) return;
    setBusy(true);
    const res = await dispatch(submitVisitReport({
      visitId: visit.id,
      payload: {
        cards: cards.map((c) => ({
          category: c.category!,
          note: c.note.trim() || undefined,
          photos: c.photos,
        })),
      },
    }));
    setBusy(false);
    if (submitVisitReport.fulfilled.match(res)) {
      setVisit(res.payload as Visit);
      toast.success(t('supervisorFlow.report.toasts.reportSaved'));
      setStep('confirm');
    } else {
      toast.error((res.payload as string) || t('supervisorFlow.report.toasts.reportSaveFailed'));
    }
  };

  /* ── Step 3: Confirm & Check Out ── */
  const handleCheckout = async () => {
    if (!visit) return;
    setBusy(true);

    let position: { lat?: number; lng?: number } = {};
    if (gpsRequired) {
      // The user's real device GPS is sent — the server checks it is within
      // the store's zone. Sending the store's own coordinates would defeat it.
      try {
        position = await getCurrentPosition();
      } catch (err) {
        toast.error(geolocationErrorMessage(err, t));
        setBusy(false);
        return;
      }
    }
    const res = await dispatch(checkout({
      visit_id: visit.id,
      lat: position.lat,
      lng: position.lng,
    }));
    setBusy(false);
    if (checkout.fulfilled.match(res)) {
      setVisit(res.payload as Visit);
      toast.success(t('supervisorFlow.confirm.toasts.visitCompleted'));
      setStep('done');
    } else {
      toast.error((res.payload as string) || t('supervisorFlow.confirm.toasts.checkoutFailed'));
    }
  };

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const storeName = selectedStore?.name ?? storeId;

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="mf-page">
      {/* Header */}
      <div className="mf-header">
        <div>
          <h1 className="mf-title">{t('supervisorFlow.title')}</h1>
          {visit && <p className="mf-subtitle">{storeName}</p>}
        </div>
        <StepIndicator current={step} />
      </div>

      {visit && <VisitTimer visit={visit} />}

      <AnimatePresence mode="wait">

        {/* ────────── STEP 1: CHECK IN ────────── */}
        {step === 'checkin' && (
          <motion.div key="checkin" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <div className="mf-section-title">
              <div className="mf-section-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6"/>
                </svg>
              </div>
              <div>
                <div className="mf-section-name">{t('merchandiserFlow.checkin.sectionTitle')}</div>
                <div className="mf-section-sub">{t('merchandiserFlow.checkin.sectionSubtitle')}</div>
              </div>
            </div>

            {upcomingSchedules.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <label className="form-label">{t('merchandiserFlow.checkin.scheduledLabel')}</label>

                {!visitsExpanded && (
                  <div className="mf-scheduled-list">
                    {upcomingSchedules.slice(0, COLLAPSED_COUNT).map((sch) => (
                      <button
                        type="button"
                        key={sch.id}
                        className={`mf-scheduled-card${scheduleId === sch.id ? ' selected' : ''}`}
                        onClick={() => { setStoreId(sch.store_id); setScheduleId(sch.id); setStoreErr(''); }}
                      >
                        <div className="mf-scheduled-store">{sch.store?.name ?? sch.store_id}</div>
                        <div className="mf-scheduled-date">{formatDate(sch.scheduled_at, i18n.language)}</div>
                        {sch.notes && <div className="mf-scheduled-notes">{sch.notes}</div>}
                      </button>
                    ))}
                  </div>
                )}

                {visitsExpanded && (
                  <div className="mf-scheduled-panel">
                    {scheduleGroups.map((group) => (
                      <div key={group.label} className="mf-scheduled-group">
                        <div className="mf-scheduled-group-label">{group.label}</div>
                        <div className="mf-scheduled-list">
                          {group.items.map((sch) => (
                            <button
                              type="button"
                              key={sch.id}
                              className={`mf-scheduled-card${scheduleId === sch.id ? ' selected' : ''}`}
                              onClick={() => { setStoreId(sch.store_id); setScheduleId(sch.id); setStoreErr(''); }}
                            >
                              <div className="mf-scheduled-store">{sch.store?.name ?? sch.store_id}</div>
                              <div className="mf-scheduled-date">{formatDate(sch.scheduled_at, i18n.language)}</div>
                              {sch.notes && <div className="mf-scheduled-notes">{sch.notes}</div>}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {hasMoreSchedules && (
                  <button
                    type="button"
                    className="mf-scheduled-toggle"
                    onClick={() => setVisitsExpanded((v) => !v)}
                  >
                    {visitsExpanded
                      ? t('merchandiserFlow.checkin.showLess')
                      : t('merchandiserFlow.checkin.seeAllVisits', { count: upcomingSchedules.length })}
                  </button>
                )}
              </div>
            )}

            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">{t('merchandiserFlow.checkin.storeLabel')}</label>
              <select
                className={`form-select ${storeErr ? 'is-error' : ''}`}
                value={storeId}
                onChange={(e) => { setStoreId(e.target.value); setScheduleId(null); setStoreErr(''); }}
              >
                <option value="">{t('merchandiserFlow.checkin.chooseStore')}</option>
                {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {storeErr && <p className="form-error">{storeErr}</p>}
            </div>

            {selectedStore && gpsRequired && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: selectedStore.latitude != null ? 'var(--primary-light)' : 'var(--gray-100)',
                border: `1px solid ${selectedStore.latitude != null ? 'var(--accent-light)' : 'var(--gray-200)'}`,
                borderRadius: 10, padding: '10px 14px', marginBottom: 4,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={selectedStore.latitude != null ? 'var(--primary)' : 'var(--gray-400)'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: selectedStore.latitude != null ? 'var(--primary)' : 'var(--gray-500)' }}>
                    {selectedStore.address || selectedStore.name}
                  </div>
                  {selectedStore.latitude != null && selectedStore.longitude != null ? (
                    <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 1 }}>
                      {Number(selectedStore.latitude).toFixed(6)}, {Number(selectedStore.longitude).toFixed(6)}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{t('merchandiserFlow.checkin.noCoordinatesSet')}</div>
                  )}
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg mf-full-btn"
              disabled={!storeId || (gpsRequired && !selectedStore?.latitude) || busy}
              onClick={handleCheckin}
              style={{ marginTop: 16 }}
            >
              {busy ? <span className="btn-spinner" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <line x1="12" y1="5" x2="12" y2="9"/><line x1="10" y1="7" x2="14" y2="7"/>
                  </svg>
                  {t('merchandiserFlow.checkin.checkInNow')}
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ────────── STEP 2: REPORT ────────── */}
        {step === 'report' && (
          <motion.div key="report" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>

            <div className="mf-store-banner">
              <div className="mf-store-banner-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6"/>
                </svg>
              </div>
              <div>
                <div className="mf-store-name">{storeName}</div>
                <div className="mf-store-sub">{t('supervisorFlow.report.sectionSubtitle')}</div>
              </div>
            </div>

            {/* Repeatable report cards — each has camera-only photos, a category, and an optional note */}
            <div style={{ marginTop: 16 }}>
              {cards.map((card, idx) => (
                <ReportCard
                  key={card.key}
                  index={idx}
                  labels={reportCardLabels}
                  category={card.category}
                  onCategoryChange={(category) => updateCard(card.key, { category })}
                  note={card.note}
                  onNoteChange={(note) => updateCard(card.key, { note })}
                  photos={card.photos}
                  onPhotosChange={(photos) => updateCard(card.key, { photos })}
                  onRemove={cards.length > 1 ? () => removeCard(card.key) : undefined}
                />
              ))}

              <button type="button" className="sf-add-card-btn" onClick={addCard}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {t('supervisorFlow.report.addCard')}
              </button>
            </div>

            <div className="mf-sticky-footer">
              <button
                className="btn btn-primary btn-lg mf-full-btn"
                disabled={!canSaveReport || busy}
                onClick={handleSaveReport}
              >
                {busy ? <span className="btn-spinner" /> : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {t('supervisorFlow.report.saveAndContinue')}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* ────────── STEP 3: CONFIRM & CHECK OUT ────────── */}
        {step === 'confirm' && (
          <motion.div key="confirm" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>

            <div className="mf-section-title">
              <div className="mf-section-icon" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div className="mf-section-name">{t('supervisorFlow.confirm.sectionTitle')}</div>
                <div className="mf-section-sub">{t('supervisorFlow.confirm.sectionSubtitle')}</div>
              </div>
            </div>

            <div className="mf-store-banner" style={{ marginBottom: 16 }}>
              <div className="mf-store-banner-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6"/>
                </svg>
              </div>
              <div>
                <div className="mf-store-name">{storeName}</div>
                <div className="mf-store-sub">{t('supervisorFlow.confirm.cardsCount', { count: (visit?.report_cards ?? cards).length })}</div>
              </div>
            </div>

            {(visit?.report_cards ?? []).map((card, idx) => (
              <div key={card.id} className="sf-report-card">
                <div className="sf-report-card-header">
                  <span className="sf-report-card-title">{t('supervisorFlow.report.cardTitle')} {idx + 1}</span>
                  <span className="sf-category-option selected" style={{ flex: 'none', cursor: 'default' }}>
                    {t(`supervisorFlow.report.categoryOptions.${card.category}`)}
                  </span>
                </div>
                {card.note && (
                  <p style={{ color: 'var(--gray-600)', fontSize: 14, marginBottom: 12, whiteSpace: 'pre-wrap' }}>{card.note}</p>
                )}
                <div className="sf-photo-grid">
                  {card.photos.map((url, pIdx) => (
                    <div key={url + pIdx} className="sf-photo-item">
                      <img src={url} alt={t('supervisorFlow.report.photoAlt')} />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <button
              className="btn btn-primary btn-lg mf-full-btn"
              disabled={busy}
              onClick={handleCheckout}
            >
              {busy ? <span className="btn-spinner" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  {t('supervisorFlow.confirm.confirmCheckOut')}
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* ────────── DONE ────────── */}
        {step === 'done' && (
          <motion.div key="done" className="mf-panel mf-done-panel" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            <div className="mf-done-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="mf-done-title">{t('supervisorFlow.done.title')}</h2>
            <p className="mf-done-sub">
              {t('supervisorFlow.done.subtitle')} <strong>{storeName}</strong>.
            </p>
            <button
              className="btn btn-primary btn-lg mf-full-btn"
              onClick={() => (onViewHistory ? onViewHistory() : navigate('/visits'))}
            >
              {t('supervisorFlow.done.viewHistory')}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
