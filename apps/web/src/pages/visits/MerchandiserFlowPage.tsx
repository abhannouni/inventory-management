import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { checkin, checkout, fetchVisits } from '../../store/slices/visitsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { auditItemsApi } from '../../api/audit-items.api';
import { productStoresApi } from '../../api/product-stores.api';
import { uploadApi } from '../../api/upload.api';
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
function calcStatus(found: number, expected: number): { label: string; color: string; bg: string } {
  if (found === 0)                         return { label: 'Out of stock', color: '#dc2626', bg: '#fee2e2' };
  if (found < Math.ceil(expected * 0.5))   return { label: 'Low stock',    color: '#d97706', bg: '#fef3c7' };
  return                                          { label: 'In stock',     color: '#16a34a', bg: '#dcfce7' };
}

/* ─────────── Manual coordinate input (replaces GPS for testing) ─────────── */
function CoordInput({ coords, onChange }: {
  coords: { lat: number; lng: number } | null;
  onChange: (c: { lat: number; lng: number } | null) => void;
}) {
  const [lat, setLat] = useState(coords ? String(coords.lat) : '');
  const [lng, setLng] = useState(coords ? String(coords.lng) : '');

  const isValid = lat.trim() !== '' && lng.trim() !== '' &&
    !isNaN(Number(lat)) && !isNaN(Number(lng)) &&
    Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;

  useEffect(() => {
    onChange(isValid ? { lat: Number(lat), lng: Number(lng) } : null);
  }, [lat, lng]);

  return (
    <div className={`coord-input-card ${isValid ? 'valid' : ''}`}>
      <div className="coord-input-header">
        <div className="coord-input-icon">
          {isValid ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>
              <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
              <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
            </svg>
          )}
        </div>
        <div>
          <div className="coord-input-title">{isValid ? 'Location set' : 'Enter coordinates'}</div>
          <div className="coord-input-sub">Testing mode — enter lat / lng manually</div>
        </div>
      </div>
      <div className="coord-fields">
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Latitude</label>
          <input
            className="form-input"
            placeholder="e.g. 33.5731"
            value={lat}
            inputMode="decimal"
            onChange={(e) => setLat(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" style={{ fontSize: 11 }}>Longitude</label>
          <input
            className="form-input"
            placeholder="e.g. -7.5898"
            value={lng}
            inputMode="decimal"
            onChange={(e) => setLng(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────── Sub-components ─────────── */
function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string; icon: string }[] = [
    { id: 'checkin',  label: 'Check In',  icon: '📍' },
    { id: 'audit',    label: 'Audit',     icon: '📋' },
    { id: 'checkout', label: 'Check Out', icon: '✅' },
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
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const { items: visits } = useAppSelector((s) => s.visits);
  const { items: stores  } = useAppSelector((s) => s.stores);

  const [step, setStep]           = useState<Step>('checkin');
  const [coords, setCoords]       = useState<{ lat: number; lng: number } | null>(null);
  const [checkoutCoords, setCheckoutCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [storeId, setStoreId]     = useState('');
  const [storeErr, setStoreErr]   = useState('');
  const [busy, setBusy]           = useState(false);

  const [visit, setVisit]         = useState<Visit | null>(null);
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [, setAuditDone] = useState(false);

  const fileRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  /* Load stores + detect existing open visit */
  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchVisits());
  }, [dispatch]);

  useEffect(() => {
    const open = visits.find((v) => v.status === 'open');
    if (open && step === 'checkin') {
      setVisit(open);
      setStoreId(open.store_id);
      setStep('audit');
      loadProductsForStore(open.store_id, open);
    }
  }, [visits]);

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
      toast.error('Could not load products for this store');
    } finally {
      setLoadingProducts(false);
    }
  };

  /* ── Step 1: Check In ── */
  const handleCheckin = async () => {
    if (!storeId) { setStoreErr('Please select a store'); return; }
    if (!coords)  { return; }
    setStoreErr('');
    setBusy(true);
    const res = await dispatch(checkin({ store_id: storeId, lat: coords.lat, lng: coords.lng, checkin_at: new Date().toISOString() }));
    setBusy(false);
    if (checkin.fulfilled.match(res)) {
      const newVisit = res.payload as Visit;
      setVisit(newVisit);
      toast.success('Checked in!');
      await loadProductsForStore(storeId, newVisit);
      setStep('audit');
    } else {
      toast.error((res.payload as string) || 'Check-in failed');
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
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }
    updateRow(id, { uploading: true });
    try {
      const res = await uploadApi.upload(file);
      updateRow(id, { photo_url: res.url, uploading: false });
    } catch {
      updateRow(id, { uploading: false });
      toast.error('Upload failed');
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
      toast.success('Audit saved!');
      setCheckoutCoords(null); // reset checkout coords for step 3
      setStep('checkout');
    } catch {
      toast.error('Failed to save audit');
    } finally {
      setBusy(false);
    }
  };

  /* ── Step 3: Check Out ── */
  const handleCheckout = async () => {
    if (!visit || !checkoutCoords) return;
    const coords = checkoutCoords;
    setBusy(true);
    const res = await dispatch(checkout({ visit_id: visit.id, lat: coords.lat, lng: coords.lng, checkout_at: new Date().toISOString() }));
    setBusy(false);
    if (checkout.fulfilled.match(res)) {
      toast.success('Visit completed!');
      setStep('done');
    } else {
      toast.error((res.payload as string) || 'Check-out failed');
    }
  };

  /* ── Summary counts ── */
  const summary = auditRows.reduce(
    (acc, r) => {
      const s = calcStatus(r.qty_found, Number(r.expected_qty));
      if (s.label === 'In stock')     acc.inStock++;
      else if (s.label === 'Low stock') acc.lowStock++;
      else acc.outStock++;
      return acc;
    },
    { inStock: 0, lowStock: 0, outStock: 0 }
  );

  const storeName = stores.find((s) => s.id === storeId)?.name ?? storeId;

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="mf-page">
      {/* Header */}
      <div className="mf-header">
        <div>
          <h1 className="mf-title">Store Visit</h1>
          {visit && <p className="mf-subtitle">{storeName}</p>}
        </div>
        <StepIndicator current={step} />
      </div>

      <AnimatePresence mode="wait">

        {/* ────────── STEP 1: CHECK IN ────────── */}
        {step === 'checkin' && (
          <motion.div key="checkin" className="mf-panel" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <div className="mf-section-title">
              <div className="mf-section-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/>
                </svg>
              </div>
              <div>
                <div className="mf-section-name">Check In to Store</div>
                <div className="mf-section-sub">We need your location and the store you're visiting</div>
              </div>
            </div>

            <CoordInput coords={coords} onChange={setCoords} />

            <AnimatePresence>
              {coords && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Select Store</label>
                    <select
                      className={`form-select ${storeErr ? 'is-error' : ''}`}
                      value={storeId}
                      onChange={(e) => { setStoreId(e.target.value); setStoreErr(''); }}
                    >
                      <option value="">Choose a store…</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {storeErr && <p className="form-error">{storeErr}</p>}
                  </div>
                  <button
                    className="btn btn-primary btn-lg mf-full-btn"
                    disabled={!storeId || busy}
                    onClick={handleCheckin}
                    style={{ marginTop: 16 }}
                  >
                    {busy ? <span className="btn-spinner" /> : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                          <line x1="12" y1="5" x2="12" y2="9"/><line x1="10" y1="7" x2="14" y2="7"/>
                        </svg>
                        Check In Now
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
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
                <div className="mf-store-sub">{auditRows.length} product{auditRows.length !== 1 ? 's' : ''} to audit</div>
              </div>
              {/* Progress pill */}
              <div className="mf-audit-progress-pill">
                {auditRows.filter((r) => r.qty_found > 0).length} / {auditRows.length}
              </div>
            </div>

            {loadingProducts ? (
              <div className="mf-loading">
                <div className="mf-spinner" />
                <p>Loading products…</p>
              </div>
            ) : auditRows.length === 0 ? (
              <div className="mf-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                <p>No products assigned to this store yet.</p>
              </div>
            ) : (
              <div className="mf-audit-list">
                {auditRows.map((row, idx) => {
                  const status = calcStatus(row.qty_found, Number(row.expected_qty));
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
                          <div className="mf-product-sku">SKU: {row.product?.sku}</div>
                        </div>
                        <div className="mf-expected-chip">
                          Expected: <strong>{Number(row.expected_qty)}</strong>
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
                        <label className="form-label" style={{ fontSize: 12 }}>Quantity Found</label>
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
                        <label className="form-label" style={{ fontSize: 12 }}>Notes (optional)</label>
                        <input
                          type="text"
                          className="form-input"
                          value={row.notes}
                          onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                          placeholder="Observations, damage, placement…"
                        />
                      </div>

                      {/* Photo */}
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Photo (optional)</label>
                        {row.photo_url ? (
                          <div className="photo-thumb-wrap" onClick={() => fileRefs.current.get(row.id)?.click()}>
                            <img src={row.photo_url} alt="shelf" />
                            <div className="photo-thumb-change">Change photo</div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="photo-capture-btn"
                            onClick={() => fileRefs.current.get(row.id)?.click()}
                            disabled={row.uploading}
                          >
                            {row.uploading ? (
                              <span style={{ fontSize: 13 }}>Uploading…</span>
                            ) : (
                              <>
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                                  <circle cx="12" cy="13" r="4"/>
                                </svg>
                                Tap to take a shelf photo
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
                      Save Audit & Continue
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
              <div className="mf-section-icon" style={{ background: 'linear-gradient(135deg, #6FCF97 0%, #1F6F5F 100%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <div className="mf-section-name">Audit Complete</div>
                <div className="mf-section-sub">Review the summary and check out</div>
              </div>
            </div>

            {/* Audit summary */}
            <div className="mf-summary-cards">
              <div className="mf-summary-card" style={{ borderColor: '#bbf7d0' }}>
                <div className="mf-summary-num" style={{ color: '#16a34a' }}>{summary.inStock}</div>
                <div className="mf-summary-lbl">In Stock</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fde68a' }}>
                <div className="mf-summary-num" style={{ color: '#d97706' }}>{summary.lowStock}</div>
                <div className="mf-summary-lbl">Low Stock</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fca5a5' }}>
                <div className="mf-summary-num" style={{ color: '#dc2626' }}>{summary.outStock}</div>
                <div className="mf-summary-lbl">Out of Stock</div>
              </div>
            </div>

            {/* Product summary rows */}
            <div className="mf-checkout-list">
              {auditRows.map((row) => {
                const status = calcStatus(row.qty_found, Number(row.expected_qty));
                return (
                  <div key={row.id} className="mf-checkout-row">
                    <div className="mf-checkout-name">{row.product?.name}</div>
                    <div className="mf-checkout-qty">
                      <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>Found </span>
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

            {/* Manual coords for checkout */}
            <CoordInput coords={checkoutCoords} onChange={setCheckoutCoords} />

            <button
              className="btn btn-primary btn-lg mf-full-btn"
              disabled={!checkoutCoords || busy}
              onClick={handleCheckout}
              style={{ marginTop: 16 }}
            >
              {busy ? <span className="btn-spinner" /> : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Confirm Check Out
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
            <h2 className="mf-done-title">Visit Complete!</h2>
            <p className="mf-done-sub">
              You've successfully audited <strong>{auditRows.length} products</strong> at <strong>{storeName}</strong>.
            </p>
            <div className="mf-summary-cards" style={{ marginBottom: 24 }}>
              <div className="mf-summary-card" style={{ borderColor: '#bbf7d0' }}>
                <div className="mf-summary-num" style={{ color: '#16a34a' }}>{summary.inStock}</div>
                <div className="mf-summary-lbl">In Stock</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fde68a' }}>
                <div className="mf-summary-num" style={{ color: '#d97706' }}>{summary.lowStock}</div>
                <div className="mf-summary-lbl">Low Stock</div>
              </div>
              <div className="mf-summary-card" style={{ borderColor: '#fca5a5' }}>
                <div className="mf-summary-num" style={{ color: '#dc2626' }}>{summary.outStock}</div>
                <div className="mf-summary-lbl">Out of Stock</div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg mf-full-btn" onClick={() => navigate('/visits')}>
              View Visit History
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
