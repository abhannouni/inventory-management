import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import { uploadApi } from '../../api/upload.api';
import type { Visit, Product } from '../../types';

interface BulkRow {
  product_id: string;
  qty_found: string;
  notes: string;
  photo_url: string;
  uploading: boolean;
}

interface BulkAuditFormProps {
  visits: Visit[];
  products: Product[];
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function BulkAuditForm({ visits, products, onSubmit, onCancel }: BulkAuditFormProps) {
  const [visitId, setVisitId] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([{ product_id: '', qty_found: '', notes: '', photo_url: '', uploading: false }]);
  const [visitError, setVisitError] = useState('');
  const [loading, setLoading] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addRow = () => setRows((r) => [...r, { product_id: '', qty_found: '', notes: '', photo_url: '', uploading: false }]);
  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));

  const updateRow = (idx: number, patch: Partial<BulkRow>) => {
    setRows((r) => r.map((row, i) => i === idx ? { ...row, ...patch } : row));
  };

  const handleUpload = async (idx: number, file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5 MB'); return; }
    updateRow(idx, { uploading: true });
    try {
      const res = await uploadApi.upload(file);
      updateRow(idx, { photo_url: res.url, uploading: false });
      toast.success('Photo uploaded!');
    } catch {
      updateRow(idx, { uploading: false });
      toast.error('Upload failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitId) { setVisitError('Visit is required'); return; }
    setVisitError('');

    const validRows = rows.filter((r) => r.product_id && r.qty_found !== '');
    if (!validRows.length) { toast.error('Add at least one audit item'); return; }

    const items = validRows.map((r) => ({
      product_id: r.product_id,
      qty_found: Number(r.qty_found),
      ...(r.notes ? { notes: r.notes } : {}),
      ...(r.photo_url ? { photo_url: r.photo_url } : {}),
    }));

    setLoading(true);
    await onSubmit({ visit_id: visitId, items });
    setLoading(false);
  };

  const visitOptions = visits.map((v) => ({
    value: v.id,
    label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString()}`,
  }));

  const productOptions = products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));

  return (
    <form onSubmit={handleSubmit}>
      <Select
        label="Visit"
        value={visitId}
        onChange={(e) => setVisitId(e.target.value)}
        options={visitOptions}
        placeholder="Select visit"
        error={visitError}
      />

      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label className="form-label">Products</label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Row</Button>
        </div>

        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', width: '30%' }}>Product</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', width: '80px' }}>Qty</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)' }}>Notes</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', width: '80px' }}>Photo</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {rows.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    style={{ borderTop: '1px solid var(--gray-100)' }}
                  >
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        className="form-select"
                        value={row.product_id}
                        onChange={(e) => updateRow(idx, { product_id: e.target.value })}
                        style={{ fontSize: 12 }}
                      >
                        <option value="">Select product</option>
                        {productOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="number"
                        min="0"
                        className="form-input"
                        value={row.qty_found}
                        onChange={(e) => updateRow(idx, { qty_found: e.target.value })}
                        placeholder="0"
                        style={{ fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={row.notes}
                        onChange={(e) => updateRow(idx, { notes: e.target.value })}
                        placeholder="Optional notes"
                        style={{ fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {row.photo_url ? (
                        <img src={row.photo_url} alt="thumb" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
                      ) : (
                        <button
                          type="button"
                          style={{ background: 'var(--gray-100)', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer', color: 'var(--gray-600)' }}
                          onClick={() => fileRefs.current[idx]?.click()}
                          disabled={row.uploading}
                        >
                          {row.uploading ? '…' : 'Upload'}
                        </button>
                      )}
                      <input
                        ref={(el) => { fileRefs.current[idx] = el; }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(idx, f); }}
                      />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      {rows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRow(idx)}
                          style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4, fontSize: 16 }}
                        >×</button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Save Bulk Audit ({rows.filter((r) => r.product_id).length} items)</Button>
      </div>
    </form>
  );
}
