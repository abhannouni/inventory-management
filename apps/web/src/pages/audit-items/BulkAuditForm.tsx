import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { uploadApi } from '../../api/upload.api';
import { handleNumberInputKeyDown } from '../../utils/numberInput';
import type { Visit, Product } from '../../types';

interface BulkRow {
  id: number;
  product_id: string;
  qty_found: number;
  notes: string;
  photo_url: string;
  uploading: boolean;
}

interface Props {
  visits: Visit[];
  products: Product[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

let rowIdCounter = 1;

export default function BulkAuditForm({ visits, products, onSubmit, onCancel }: Props) {
  const { t, i18n } = useTranslation('auditItems');
  const { t: tCommon } = useTranslation('common');
  const [visitId, setVisitId] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([
    { id: rowIdCounter++, product_id: '', qty_found: 0, notes: '', photo_url: '', uploading: false },
  ]);
  const [visitError, setVisitError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const addRow = () => {
    setRows((r) => [...r, { id: rowIdCounter++, product_id: '', qty_found: 0, notes: '', photo_url: '', uploading: false }]);
  };

  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));

  const updateRow = (id: number, patch: Partial<BulkRow>) => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const adjustQty = (id: number, delta: number) => {
    setRows((r) =>
      r.map((row) => (row.id === id ? { ...row, qty_found: Math.max(0, row.qty_found + delta) } : row))
    );
  };

  const handleUpload = async (id: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error(t('bulkForm.toasts.fileTooLarge')); return; }
    updateRow(id, { uploading: true });
    try {
      const res = await uploadApi.upload(file);
      updateRow(id, { photo_url: res.url, uploading: false });
      toast.success(t('bulkForm.toasts.photoUploaded'));
    } catch {
      updateRow(id, { uploading: false });
      toast.error(t('bulkForm.toasts.uploadError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId) { setVisitError(t('bulkForm.visitRequired')); return; }
    setVisitError('');
    const valid = rows.filter((r) => r.product_id);
    if (!valid.length) { toast.error(t('bulkForm.toasts.addAtLeastOneProduct')); return; }
    const items = valid.map((r) => ({
      product_id: r.product_id,
      qty_found: r.qty_found,
      ...(r.notes ? { notes: r.notes } : {}),
      ...(r.photo_url ? { photo_url: r.photo_url } : {}),
    }));
    setLoading(true);
    await onSubmit({ visit_id: visitId, items });
    setLoading(false);
  };

  const visitOptions = visits.map((v) => ({
    value: v.id,
    label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString(i18n.language)}`,
  }));
  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));
  const filledCount = rows.filter((r) => r.product_id).length;

  return (
    <form onSubmit={handleSubmit}>
      {/* Visit selector */}
      <Select
        label={t('bulkForm.visit')}
        value={visitId}
        onChange={(e) => { setVisitId(e.target.value); setVisitError(''); }}
        options={visitOptions}
        placeholder={t('bulkForm.selectVisit')}
        error={visitError}
      />

      {/* Product cards */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label className="form-label" style={{ margin: 0 }}>
            {t('bulkForm.products')} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>{t('bulkForm.productsAdded', { count: filledCount })}</span>
          </label>
        </div>

        <AnimatePresence initial={false}>
          {rows.map((row, index) => (
            <motion.div
              key={row.id}
              className="audit-card-row"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.96 }}
              transition={{ duration: 0.2 }}
            >
              {/* Card header */}
              <div className="audit-card-header">
                <span className="audit-card-num">{t('bulkForm.item', { number: index + 1 })}</span>
                {rows.length > 1 && (
                  <button type="button" className="audit-card-remove" onClick={() => removeRow(row.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Product select */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>{t('bulkForm.product')}</label>
                <select
                  className="form-select"
                  value={row.product_id}
                  onChange={(e) => updateRow(row.id, { product_id: e.target.value })}
                >
                  <option value="">{t('bulkForm.selectProduct')}</option>
                  {productOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {/* Qty stepper */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>{t('bulkForm.qtyFound')}</label>
                <div className="qty-stepper">
                  <button type="button" className="qty-stepper-btn" onClick={() => adjustQty(row.id, -1)}>−</button>
                  <input
                    type="number"
                    min="0"
                    className="qty-stepper-input"
                    value={row.qty_found}
                    onKeyDown={handleNumberInputKeyDown}
                    onChange={(e) => updateRow(row.id, { qty_found: Math.max(0, Number(e.target.value)) })}
                  />
                  <button type="button" className="qty-stepper-btn" onClick={() => adjustQty(row.id, 1)}>+</button>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label" style={{ fontSize: 12 }}>{t('bulkForm.notesLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={row.notes}
                  onChange={(e) => updateRow(row.id, { notes: e.target.value })}
                  placeholder={t('bulkForm.notesPlaceholder')}
                />
              </div>

              {/* Photo */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: 12 }}>{t('bulkForm.photoLabel')}</label>
                {row.photo_url ? (
                  <div className="photo-thumb-wrap" onClick={() => fileRefs.current.get(row.id)?.click()}>
                    <img src={row.photo_url} alt="thumb" />
                    <div className="photo-thumb-change">{t('bulkForm.changePhoto')}</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="photo-capture-btn"
                    onClick={() => fileRefs.current.get(row.id)?.click()}
                    disabled={row.uploading}
                  >
                    {row.uploading ? (
                      <span style={{ fontSize: 13 }}>{t('bulkForm.uploading')}</span>
                    ) : (
                      <>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                        <span>{t('bulkForm.tapToAddPhoto')}</span>
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
          ))}
        </AnimatePresence>

        {/* Add item button */}
        <button
          type="button"
          onClick={addRow}
          style={{
            width: '100%',
            padding: '14px',
            border: '2px dashed var(--primary-light)',
            borderRadius: 14,
            background: 'transparent',
            color: 'var(--primary)',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('bulkForm.addAnotherProduct')}
        </button>
      </div>

      {/* Form actions */}
      <div className="form-actions" style={{ marginTop: 16 }}>
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading} disabled={filledCount === 0}>
          {filledCount > 0 ? t('bulkForm.saveItems', { count: filledCount }) : t('bulkForm.saveAudit')}
        </Button>
      </div>
    </form>
  );
}
