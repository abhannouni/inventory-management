import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { checkin, checkout, fetchVisits, fetchActiveVisit } from '../../store/slices/visitsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchSchedules } from '../../store/slices/schedulesSlice';
import VisitTimer from '../../components/ui/VisitTimer';
import { auditItemsApi } from '../../api/audit-items.api';
import { productStoresApi } from '../../api/product-stores.api';
import { uploadApi } from '../../api/upload.api';
import { formatDate } from '../../utils/format';
import type { Visit, ProductStore } from '../../types';

/* ─────────── Types ─────────── */
type Step = 'checkin' | 'audit' | 'checkout' | 'done';

interface AuditRow extends ProductStore {
  qty_found: number;
  notes: string;
  photo_url: string;
  uploading: boolean;
}

/* ─────────── Helpers ─────────── */
function calcStatus(
  found: number,
  expected: number,
  labels: { outOfStock: string; lowStock: string; inStock: string },
): { label: string; color: string; bg: string } {
  if (found === 0)                         return { label: labels.outOfStock, color: '#dc2626', bg: '#fee2e2' };
  if (found < Math.ceil(expected * 0.5))   return { label: labels.lowStock,   color: '#d97706', bg: '#fef3c7' };
  return                                          { label: labels.inStock,    color: '#16a34a', bg: '#dcfce7' };
}

/* ─────────── Sub-components ─────────── */
function StepIndicator({ current }: { current: Step }) {
  const { t } = useTranslation('visits');
  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'checkin',  label: t('merchandiserFlow.steps.checkin'),  icon: '📍' },
    { id: 'audit',    label: t('merchandiserFlow.steps.audit'),     icon: '📋' },
    { id: 'checkout', label: t('merchandiserFlow.steps.checkout'), icon: '✅' },
  ];
  const idx = ['checkin','audit','checkout','done'].indexOf(current);
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
export default function MerchandiserFlowPage() {
  const { t, i18n } = useTranslation('visits');
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { active: activeVisit } = useAppSelector((s) => s.visits);
  const { items: stores  } = useAppSelector((s) => s.stores);
  const { items: schedules } = useAppSelector((s) => s.schedules);
  const currentUserId = useAppSelector((s) => s.auth.user?.id);

  const statusLabels = {
    outOfStock: t('merchandiserFlow.audit.status.outOfStock'),
    lowStock: t('merchandiserFlow.audit.status.lowStock'),
    inStock: t('merchandiserFlow.audit.status.inStock'),
  };

  const [step, setStep]           = useState<Step>('checkin');
  const [storeId, setStoreId]     = useState('');
  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const [storeErr, setStoreErr]   = useState('');
  const [busy, setBusy]           = useState(false);

  const [visit, setVisit]         = useState<Visit | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [, setAuditDone] = useState(false);

  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

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

  /* Resume an in-progress visit after a refresh, a re-login, or a switch of device.
     The server is the source of truth: it returns the open visit along with the
     elapsed seconds measured from the stored checkin_at, so the timer picks up
     exactly where it left off rather than restarting at zero. */
  useEffect(() => {
    if (activeVisit && step === 'checkin') {
      setVisit(activeVisit);
      setStoreId(activeVisit.store_id);
      setStep('audit');
      loadProductsForStore(activeVisit.store_id, activeVisit);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVisit]);

  /* Load products for the selected store */
  const loadProductsForStore = async (sid: string, v: Visit) => {
    setLoadingProducts(true);
    try {
      const psList = await productStoresApi.findAll({ store_id: sid });
      const rows: AuditRow[] = psList.map((ps) => ({
        ...ps,
        qty_found:  0,
        notes:      '',
        photo_url:  '',
        uploading:  false,
      }));
      setAuditRows(rows);

      /* Pre-fill any already-submitted audit items for this visit */
      if (v.audit_items?.length) {
        setAuditRows((prev) =>
          prev.map((row) => {
            const existing = v.audit_items!.find((a) => a.product_id === row.product_id);
            return existing
              ? { ...row, qty_found: existing.qty_found, notes: existing.notes ?? '', photo_url: existing.photo_url ?? '' }
              : row;
          })
        );
      }
    } catch {
      toast.error(t('merchandiserFlow.audit.loadProductsFailed'));
    } finally {
      setLoadingProducts(false);
    }
  };

  /* ── Step 1: Check In ── */
  const handleCheckin = async () => {
    if (!storeId) { setStoreErr(t('merchandiserFlow.checkin.errors.storeRequired')); return; }
    if (!selectedStore?.latitude || !selectedStore?.longitude) {
      setStoreErr(t('merchandiserFlow.checkin.errors.noGpsCoordinates'));
      return;
    }
    setStoreErr('');
    setBusy(true);
    // The server starts the clock — no client timestamp is sent.
    const res = await dispatch(checkin({
      store_id: storeId,
      schedule_id: scheduleId ?? undefined,
      lat: Number(selectedStore.latitude),
      lng: Number(selectedStore.longitude),
    }));
    setBusy(false);
    if (checkin.fulfilled.match(res)) {
      const newVisit = res.payload as Visit;
      setVisit(newVisit);
      toast.success(t('merchandiserFlow.checkin.toasts.checkedIn'));
      await loadProductsForStore(storeId, newVisit);
      setStep('audit');
    } else {
      toast.error((res.payload as string) || t('merchandiserFlow.checkin.toasts.checkinFailed'));
    }
  };

  /* ── Step 2: Audit rows ── */
  const updateRow = (id: string, patch: Partial<AuditRow>) =>
    setAuditRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const adjustQty = (id: string, delta: number) =>
    setAuditRows((r) =>
      r.map((row) => row.id === id ? { ...row, qty_found: Math.max(0, row.qty_found + delta) } : row)
    );

  const handleUpload = async (id: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error(t('merchandiserFlow.audit.toasts.fileTooLarge')); return; }
    updateRow(id, { uploading: true });
    try {
      const res = await uploadApi.upload(file);
      updateRow(id, { photo_url: res.url, uploading: false });
    } catch {
      updateRow(id, { uploading: false });
      toast.error(t('merchandiserFlow.audit.toasts.uploadFailed'));
    }
  };

  const handleSubmitAudit = async () => {
    if (!visit) return;
    setBusy(true);
    try {
      const items = auditRows.map((r) => ({
        product_id: r.product_id,
        qty_found:  r.qty_found,
        ...(r.notes     ? { notes:     r.notes     } : {}),
        ...(r.photo_url ? { photo_url: r.photo_url } : {}),
      }));
      await auditItemsApi.bulkUpsert({ visit_id: visit.id, items });
      setAuditDone(true);
      toast.success(t('merchandiserFlow.audit.toasts.auditSaved'));
      setStep('checkout');
    } catch {
      toast.error(t('merchandiserFlow.audit.toasts.auditSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  /* ── Step 3: Check Out ── */
  const handleCheckout = async () => {
    if (!visit) return;
    setBusy(true);
    // The server stamps check-out and computes the stored duration.
    const res = await dispatch(checkout({
      visit_id: visit.id,
      lat: Number(visit.store?.latitude),
      lng: Number(visit.store?.longitude),
    }));
    setBusy(false);
    if (checkout.fulfilled.match(res)) {
      // Swap in the completed visit so the timer freezes on the server's duration
      // rather than continuing to tick against the now-stale open payload.
      setVisit(res.payload as Visit);
      toast.success(t('merchandiserFlow.checkout.toasts.visitCompleted'));
      setStep('done');
    } else {
      toast.error((res.payload as string) || t('merchandiserFlow.checkout.toasts.checkoutFailed'));
    }
  };

  /* ── Summary counts ── */
  const summary = auditRows.reduce(
    (acc, r) => {
      const s = calcStatus(r.qty_found, Number(r.expected_qty), statusLabels);
      if (s.label === statusLabels.inStock)     acc.inStock++;
      else if (s.label === statusLabels.lowStock) acc.lowStock++;
      else acc.outStock++;
      return acc;
    },
    { inStock: 0, lowStock: 0, outStock: 0 }
  );

  const selectedStore = stores.find((s) => s.id === storeId) ?? null;
  const storeName = selectedStore?.name ?? storeId;

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="mf-page">
      {/* Header */}
      <div className="mf-header">
        <div>
          <h1 className="mf-title">{t('merchandiserFlow.title')}</h1>
          {visit && <p className="mf-subtitle">{storeName}</p>}
        </div>
        <StepIndicator current={step} />
      </div>

      {/* Runs from check-in through check-out, then freezes on the stored duration. */}
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
              <div className="mf-scheduled-list" style={{ marginTop: 16 }}>
                <label className="form-label">{t('merchandiserFlow.checkin.scheduledLabel')}</label>
                {upcomingSchedules.map((sch) => (
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

            {selectedStore && (
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
              disabled={!storeId || !selectedStore?.latitude || busy}
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

        {/* ────────── STEP 2: AUDIT ────────── */}
        {step === 'audit' && (
          <motion.div key="audit" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>

            {/* Store info banner */}
            <div className="mf-store-banner">
              <div className="mf-store-banner-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM3 9l2.45-4.9A2 2 0 017.24 3h9.52a2 2 0 011.8 1.1L21 9M12 3v6"/>
                </svg>
              </div>
              <div>
                <div className="mf-store-name">{storeName}</div>
                <div className="mf-store-sub">{t('merchandiserFlow.audit.productCount', { count: auditRows.length })}</div>
              </div>
              {/* Progress pill */}
              <div className="mf-audit-progress-pill">
                {auditRows.filter((r) => r.qty_found > 0).length} / {auditRows.length}
              </div>
            </div>

            {loadingProducts ? (
              <div className="mf-loading">
                <div className="mf-spinner" />
                <p>{t('merchandiserFlow.audit.loadingProducts')}</p>
              </div>
            ) : auditRows.length === 0 ? (
              <div className="mf-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p>{t('merchandiserFlow.audit.noProducts')}</p>
              </div>
            ) : (
              <div className="mf-audit-list">
                {auditRows.map((row, idx) => {
                  const status = calcStatus(row.qty_found, Number(row.expected_qty), statusLabels);
                  return (
                    <motion.div
                      key={row.id}
                      className="mf-product-card"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                    >
                      {/* Product header */}
                      <div className="mf-product-header">
                        <div className="mf-product-num">#{idx + 1}</div>
                        <div className="mf-product-info">
                          <div className="mf-product-name">{row.product?.name ?? row.product_id}</div>
                          <div className="mf-product-sku">{t('merchandiserFlow.audit.sku', { sku: row.product?.sku })}</div>
                        </div>
                        <div className="mf-expected-chip">
                          {t('merchandiserFlow.audit.expected')} <strong>{Number(row.expected_qty)}</strong>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div
                        className="mf-status-badge"
                        style={{ background: status.bg, color: status.color }}
                      >
                        <span className="mf-status-dot" style={{ background: status.color }} />
                        {status.label}
                      </div>

                      {/* Qty stepper */}
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>{t('merchandiserFlow.audit.quantityFound')}</label>
                        <div className="qty-stepper">
                          <button type="button" className="qty-stepper-btn" onClick={() => adjustQty(row.id, -1)}>−</button>
                          <input
                            type="number"
                            min="0"
                            className="qty-stepper-input"
                            value={row.qty_found}
                            onChange={(e) => updateRow(row.id, { qty_found: Math.max(0, Number(e.target.value)) })}
                          />
                          <button type="button" className="qty-stepper-btn" onClick={() => adjustQty(row.id, 1)}>+</button>
                        </div>
                      </div>

                      {/* Notes */}
                      <div className="form-group" style={{ marginBottom: 12 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>{t('merchandiserFlow.audit.notesLabel')}</label>
                        <input
                          type="text"
                          className="form-input"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          placeholder={t('merchandiserFlow.audit.notesPlaceholder')}
                        />
                      </div>

                      {/* Photo */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>{t('merchandiserFlow.audit.photoLabel')}</label>
                        {row.photo_url ? (
                          <div className="photo-thumb-wrap" onClick={() => fileRefs.current.get(row.id)?.click()}>
                            <img src={row.photo_url} alt={t('merchandiserFlow.audit.photoAlt')} />
                            <div className="photo-thumb-change">{t('merchandiserFlow.audit.changePhoto')}</div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="photo-capture-btn"
                            onClick={() => fileRefs.current.get(row.id)?.click()}
                            disabled={row.uploading}
                          >
                            {row.uploading ? (
                              <span style={{ fontSize: 13 }}>{t('merchandiserFlow.audit.uploading')}</span>
                            ) : (
                              <>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                                  <circle cx="12" cy="13" r="4"/>
                                </svg>
                                {t('merchandiserFlow.audit.takePhoto')}
                              </>
                            )}
                          </button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          style={{ display: 'none' }}
                          ref={(el) => { if (el) fileRefs.current.set(row.id, el); }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(row.id, f); }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Submit audit button */}
            {!loadingProducts && auditRows.length > 0 && (
              <div className="mf-sticky-footer">
                <button
                  className="btn btn-primary btn-lg mf-full-btn"
                  disabled={busy}
                  onClick={handleSubmitAudit}
                >
                  {busy ? <span className="btn-spinner" /> : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {t('merchandiserFlow.audit.saveAndContinue')}
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ────────── STEP 3: CHECK OUT ────────── */}
        {step === 'checkout' && (
          <motion.div key="checkout" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>

            <div className="mf-section-title">
              <div className="mf-section-icon" style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div className="mf-section-name">{t('merchandiserFlow.checkout.sectionTitle')}</div>
                <div className="mf-section-sub">{t('merchandiserFlow.checkout.sectionSubtitle')}</div>
              </div>
            </div>

            {/* Audit summary */}
            <div className="mf-summary-cards">
              <div className="mf-summary-card" style={{ borderColor: '#bbf7d0' }}>
                <div className="mf-summary-num" style={{ color: '#16a34a' }}>{summary.inStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.inStock')}</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fde68a' }}>
                <div className="mf-summary-num" style={{ color: '#d97706' }}>{summary.lowStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.lowStock')}</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fca5a5' }}>
                <div className="mf-summary-num" style={{ color: '#dc2626' }}>{summary.outStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.outOfStock')}</div>
              </div>
            </div>

            {/* Product summary rows */}
            <div className="mf-checkout-list">
              {auditRows.map((row) => {
                const status = calcStatus(row.qty_found, Number(row.expected_qty), statusLabels);
                return (
                  <div key={row.id} className="mf-checkout-row">
                    <div className="mf-checkout-name">{row.product?.name}</div>
                    <div className="mf-checkout-qty">
                      <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>{t('merchandiserFlow.checkout.found')} </span>
                      <strong style={{ color: status.color }}>{row.qty_found}</strong>
                      <span style={{ color: 'var(--gray-400)', fontSize: 12 }}> / {Number(row.expected_qty)}</span>
                    </div>
                    <div className="mf-checkout-badge" style={{ background: status.bg, color: status.color }}>
                      {status.label}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary btn-lg mf-full-btn"
              disabled={busy}
              onClick={handleCheckout}
              style={{ marginTop: 16 }}
            >
              {busy ? <span className="btn-spinner" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  {t('merchandiserFlow.checkout.confirmCheckOut')}
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
            <h2 className="mf-done-title">{t('merchandiserFlow.done.title')}</h2>
            <p className="mf-done-sub">
              {t('merchandiserFlow.done.subtitlePrefix')} <strong>{t('merchandiserFlow.done.productsCount', { count: auditRows.length })}</strong> {t('merchandiserFlow.done.subtitleAt')} <strong>{storeName}</strong>.
            </p>
            <div className="mf-summary-cards" style={{ marginBottom: 24 }}>
              <div className="mf-summary-card" style={{ borderColor: '#bbf7d0' }}>
                <div className="mf-summary-num" style={{ color: '#16a34a' }}>{summary.inStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.inStock')}</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fde68a' }}>
                <div className="mf-summary-num" style={{ color: '#d97706' }}>{summary.lowStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.lowStock')}</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fca5a5' }}>
                <div className="mf-summary-num" style={{ color: '#dc2626' }}>{summary.outStock}</div>
                <div className="mf-summary-lbl">{t('merchandiserFlow.checkout.outOfStock')}</div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg mf-full-btn" onClick={() => navigate('/visits')}>
              {t('merchandiserFlow.done.viewHistory')}
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
