import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProductReport } from '../../store/slices/reportsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import type { AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function ProductReport() {
  const { t, i18n } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { productReport, loading } = useAppSelector((s) => s.reports);
  const { items: products } = useAppSelector((s) => s.products);
  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const handleLoad = async () => {
    if (!productId) { toast.error(t('productReport.selectProductToast')); return; }
    const res = await dispatch(fetchProductReport({ id: productId, filters: { from: from || undefined, to: to || undefined } }));
    if (fetchProductReport.rejected.match(res)) toast.error(res.payload as string || t('productReport.loadErrorToast'));
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <Select
          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder={t('productReport.selectProductPlaceholder')}
          label=""
        />
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('filters.from')}</label>
          <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">{t('filters.to')}</label>
          <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ alignSelf: 'flex-end' }}>
          <Button onClick={handleLoad} disabled={!productId}>{t('filters.loadReport')}</Button>
        </div>
      </div>

      {loading && <Spinner center size="lg" />}

      {!loading && productReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontWeight: 700, fontSize: 16 }}>{productReport.product.name}</h3>
                  <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{productReport.product.sku}</span>
                    <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{productReport.product.category}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{productReport.history?.length ?? 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t('productReport.totalScans')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('productReport.table.store')}</th>
                  <th>{t('productReport.table.date')}</th>
                  <th>{t('productReport.table.qtyFound')}</th>
                  <th>{t('productReport.table.status')}</th>
                  <th>{t('productReport.table.notes')}</th>
                </tr>
              </thead>
              <tbody>
                {(productReport.history || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty">{t('productReport.noHistory')}</td>
                  </tr>
                ) : (
                  (productReport.history || []).map((h, i) => (
                    <motion.tr
                      key={h.visit_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <td style={{ fontWeight: 500 }}>{h.store?.name || h.visit_id}</td>
                      <td style={{ color: 'var(--gray-500)' }}>{formatDate(h.checkin_at, i18n.language)}</td>
                      <td style={{ fontWeight: 600 }}>{h.qty_found}</td>
                      <td><Badge variant={statusBadge[h.status as AuditStatus]}>{tCommon(`status.${h.status}`)}</Badge></td>
                      <td style={{ color: 'var(--gray-500)' }}>{h.notes || '—'}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {!loading && !productReport && (
        <div className="empty-state">
          <div className="empty-state-title">{t('productReport.emptyState')}</div>
        </div>
      )}
    </div>
  );
}
