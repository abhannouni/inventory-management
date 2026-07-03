import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStoreReport } from '../../store/slices/reportsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { useEffect } from 'react';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { formatDate } from '../../utils/format';
import type { AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function StoreReport() {
  const { t, i18n } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { storeReport, loading } = useAppSelector((s) => s.reports);
  const { items: stores } = useAppSelector((s) => s.stores);
  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { dispatch(fetchStores()); }, [dispatch]);

  const handleLoad = async () => {
    if (!storeId) { toast.error(t('storeReport.selectStoreToast')); return; }
    const res = await dispatch(fetchStoreReport({ id: storeId, filters: { from: from || undefined, to: to || undefined } }));
    if (fetchStoreReport.rejected.match(res)) toast.error(res.payload as string || t('storeReport.loadErrorToast'));
  };

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <Select
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          value={storeId}
          onChange={(e) => setStoreId(e.target.value)}
          placeholder={t('storeReport.selectStorePlaceholder')}
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
          <Button onClick={handleLoad} disabled={!storeId}>{t('filters.loadReport')}</Button>
        </div>
      </div>

      {loading && <Spinner center size="lg" />}

      {!loading && storeReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-body">
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>{storeReport.store.name}</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>{storeReport.store.address}</p>
            </div>
          </div>

          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            {t('storeReport.visitHistory', { count: storeReport.visits?.length ?? 0 })}
          </h3>

          {(storeReport.visits || []).map((v, i) => (
            <motion.div
              key={v.id}
              className="card"
              style={{ marginBottom: 12 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontWeight: 600 }}>{formatDate(v.checkin_at, i18n.language)}</p>
                    {v.checkout_at && <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>{t('storeReport.closed', { date: formatDate(v.checkout_at, i18n.language) })}</p>}
                  </div>
                  <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                    {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                  </Badge>
                </div>

                {v.audit_items && v.audit_items.length > 0 && (
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--gray-50)' }}>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--gray-500)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('storeReport.table.product')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--gray-500)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('storeReport.table.qtyFound')}</th>
                        <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--gray-500)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>{t('storeReport.table.status')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.audit_items.map((ai: any) => (
                        <tr key={ai.id} style={{ borderTop: '1px solid var(--gray-100)' }}>
                          <td style={{ padding: '6px 8px' }}>{ai.product?.name || ai.product_id}</td>
                          <td style={{ padding: '6px 8px', fontWeight: 600 }}>{ai.qty_found}</td>
                          <td style={{ padding: '6px 8px' }}><Badge variant={statusBadge[ai.status as AuditStatus]}>{tCommon(`status.${ai.status}`)}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && !storeReport && (
        <div className="empty-state">
          <div className="empty-state-title">{t('storeReport.emptyState')}</div>
        </div>
      )}
    </div>
  );
}
