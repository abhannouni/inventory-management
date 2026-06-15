import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { uploadApi } from '../../api/upload.api';
import type { AuditItem, Visit, Product } from '../../types';

interface AuditItemFormProps {
  visits: Visit[];
  products: Product[];
  initialData?: AuditItem;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function AuditItemForm({ visits, products, initialData, onSubmit, onCancel }: AuditItemFormProps) {
  const [form, setForm] = useState({
    visit_id: initialData?.visit_id || '',
    product_id: initialData?.product_id || '',
    qty_found: initialData?.qty_found?.toString() || '',
    notes: initialData?.notes || '',
    photo_url: initialData?.photo_url || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(initialData?.photo_url || '');
  const fileRef = useRef<HTMLInputElement>(null);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.visit_id) errs.visit_id = 'Visit is required';
    if (!form.product_id) errs.product_id = 'Product is required';
    if (!form.qty_found) errs.qty_found = 'Quantity is required';
    else if (isNaN(Number(form.qty_found)) || Number(form.qty_found) < 0) errs.qty_found = 'Invalid quantity';
    return errs;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP files are allowed'); return;
    }

    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await uploadApi.upload(file);
      setForm((f) => ({ ...f, photo_url: res.url }));
      toast.success('Photo uploaded!');
    } catch {
      toast.error('Failed to upload photo');
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
    await onSubmit(payload);
    setLoading(false);
  };

  const visitOptions = visits.map((v) => ({
    value: v.id,
    label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString()}`,
  }));

  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <Select label="Visit" value={form.visit_id} onChange={(e) => setForm({ ...form, visit_id: e.target.value })} options={visitOptions} placeholder="Select visit" error={errors.visit_id} />
        <Select label="Product" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} options={productOptions} placeholder="Select product" error={errors.product_id} />
      </div>

      <Input label="Quantity Found" type="number" min="0" value={form.qty_found} onChange={(e) => setForm({ ...form, qty_found: e.target.value })} error={errors.qty_found} placeholder="e.g. 12" />

      <div className="form-group">
        <label className="form-label">Notes (optional)</label>
        <textarea
          className="form-textarea"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Any observations about stock levels, placement, etc."
        />
      </div>

      <div className="form-group">
        <label className="form-label">Photo (optional)</label>
        <div
          className="photo-upload"
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <p style={{ color: 'var(--gray-500)' }}>Uploading…</p>
          ) : preview ? (
            <>
              <img src={preview} alt="preview" className="photo-preview" />
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--gray-400)' }}>Click to change photo</p>
            </>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="1.5" style={{ margin: '0 auto 8px' }}>
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>Click to upload a photo</p>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>JPEG, PNG, WebP — max 5 MB</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFileChange} />
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading || uploading}>Cancel</Button>
        <Button type="submit" loading={loading} disabled={uploading}>{initialData ? 'Update' : 'Create'}</Button>
      </div>
    </form>
  );
}
