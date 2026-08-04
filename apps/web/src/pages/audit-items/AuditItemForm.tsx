import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { uploadApi } from '../../api/upload.api';
import { auditItemsApi } from '../../api/audit-items.api';
import type { AuditItem, Visit, Product } from '../../types';

interface AuditItemFormProps {
  visits: Visit[];
  products: Product[];
  initialData?: AuditItem;
  /** Pre-selects the visit the page is currently filtered on, for new items. */
  defaultVisitId?: string;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function AuditItemForm({ visits, products, initialData, defaultVisitId, onSubmit, onCancel }: AuditItemFormProps) {
  const { t, i18n } = useTranslation('auditItems');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({
    visit_id: initialData?.visit_id || defaultVisitId || '',
    product_id: initialData?.product_id || '',
    qty_found: initialData?.qty_found?.toString() || '',
    notes: initialData?.notes || '',
    photo_url: initialData?.photo_url || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialData?.photo_url || '');
  const [visitItems, setVisitItems] = useState<AuditItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load what's already been audited on the selected visit, so we can warn
  // about (and offer to fix) re-auditing the same product instead of hitting
  // the backend's unique-constraint error on submit.
  useEffect(() => {
    if (initialData || !form.visit_id) { setVisitItems([]); return; }
    let cancelled = false;
    auditItemsApi.findAll({ visit_id: form.visit_id })
      .then((res) => { if (!cancelled) setVisitItems(res); })
      .catch(() => { if (!cancelled) setVisitItems([]); });
    return () => { cancelled = true; };
  }, [form.visit_id, initialData]);

  const duplicate = useMemo(
    () => (initialData ? undefined : visitItems.find((i) => i.product_id === form.product_id)),
    [initialData, visitItems, form.product_id],
  );

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.visit_id) errs.visit_id = t('form.errors.visitRequired');
    if (!form.product_id) errs.product_id = t('form.errors.productRequired');
    if (!form.qty_found) errs.qty_found = t('form.errors.qtyRequired');
    else if (isNaN(Number(form.qty_found)) || Number(form.qty_found) < 0) errs.qty_found = t('form.errors.qtyInvalid');
    return errs;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { toast.error(t('form.toasts.fileTooLarge')); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error(t('form.toasts.invalidFileType')); return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await uploadApi.upload(file);
      setForm((f) => ({ ...f, photo_url: res.url }));
      toast.success(t('form.toasts.photoUploaded'));
    } catch {
      toast.error(t('form.toasts.photoUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    const payload: any = { ...form, qty_found: Number(form.qty_found) };
    if (!payload.notes) delete payload.notes;
    if (!payload.photo_url) delete payload.photo_url;
    if (duplicate) payload.id = duplicate.id;
    await onSubmit(payload);
    setLoading(false);
  };

  const useExistingQty = () => {
    if (!duplicate) return;
    setForm((f) => ({ ...f, qty_found: duplicate.qty_found.toString(), notes: duplicate.notes || f.notes }));
  };

  const visitOptions = visits.map((v) => ({
    value: v.id,
    label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString(i18n.language)}`,
  }));

  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <Select label={t('form.visit')} value={form.visit_id} onChange={(e) => setForm({ ...form, visit_id: e.target.value })} options={visitOptions} placeholder={t('form.selectVisit')} error={errors.visit_id} />
        <Select label={t('form.product')} value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} options={productOptions} placeholder={t('form.selectProduct')} error={errors.product_id} />
      </div>

      {duplicate && (
        <div className="audit-duplicate-notice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div><strong>{t('form.duplicate.title')}</strong></div>
            <div>{t('form.duplicate.message', { qty: duplicate.qty_found })}</div>
            <div className="audit-duplicate-notice-actions">
              <Button type="button" size="sm" variant="outline" onClick={useExistingQty}>
                {t('form.duplicate.useExisting')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Input label={t('form.qtyFoundLabel')} type="number" min="0" value={form.qty_found} onChange={(e) => setForm({ ...form, qty_found: e.target.value })} error={errors.qty_found} placeholder={t('form.qtyFoundPlaceholder')} />

      <div className="form-group">
        <label className="form-label">{t('form.notesLabel')}</label>
        <textarea
          className="form-textarea"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder={t('form.notesPlaceholder')}
        />
      </div>

      <div className="form-group">
        <label className="form-label">{t('form.photoLabel')}</label>
        <div
          className="photo-upload"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <p style={{ color: 'var(--gray-500)' }}>{t('form.photoUploading')}</p>
          ) : preview ? (
            <>
              <img src={preview} alt="preview" className="photo-preview" />
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-400)' }}>{t('form.photoChangeHint')}</p>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>{t('form.photoUploadHint')}</p>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>{t('form.photoFormatsHint')}</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading || uploading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading} disabled={uploading}>{initialData || duplicate ? tCommon('actions.update') : tCommon('actions.create')}</Button>
      </div>
    </form>
  );
}
