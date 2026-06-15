import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisit } from '../../store/slices/visitsSlice';
import { fetchAuditItems } from '../../store/slices/auditItemsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';
import type { AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

const statusLabel: Record<AuditStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export default function VisitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selected: visit, loading } = useAppSelector((s) => s.visits);
  const { items: auditItems } = useAppSelector((s) => s.auditItems);

  useEffect(() => {
    if (id) {
      dispatch(fetchVisit(id));
      dispatch(fetchAuditItems({ visit_id: id }));
    }
  }, [id, dispatch]);

  if (loading) return <Spinner center size="lg" />;
  if (!visit) return <div className="empty-state"><p>Visit not found</p></div>;

  const items = visit.audit_items || auditItems;
  const total = items.length;
  const inStock = items.filter((i) => i.status === 'in_stock').length;
  const lowStock = items.filter((i) => i.status === 'low_stock').length;
  const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;

  return (
    <div>
      <PageHeader
        title="Visit Detail"
        subtitle={`${visit.store?.name || 'Store'} — ${formatDate(visit.checkin_at)}`}
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>← Back</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 16 }}>Visit Info</h3>
            <div className="visit-detail-grid">
              <div className="detail-item">
                <span className="detail-label">Store</span>
                <span className="detail-value">{visit.store?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status</span>
                <Badge variant={visit.status === 'open' ? 'success' : 'gray'} dot>
                  {visit.status === 'open' ? 'Open' : 'Closed'}
                </Badge>
              </div>
              <div className="detail-item">
                <span className="detail-label">Check-in</span>
                <span className="detail-value">{formatDate(visit.checkin_at)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Check-out</span>
                <span className="detail-value">{visit.checkout_at ? formatDate(visit.checkout_at) : '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">GPS In</span>
                <span className="gps-coords">{visit.checkin_lat.toFixed(5)}, {visit.checkin_lng.toFixed(5)}</span>
              </div>
              {visit.checkout_lat && (
                <div className="detail-item">
                  <span className="detail-label">GPS Out</span>
                  <span className="gps-coords">{visit.checkout_lat.toFixed(5)}, {visit.checkout_lng?.toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>Audit Summary</h3>
            <div className="summary-grid" style={{ background: 'transparent', padding: 0, gap: 16 }}>
              <div className="summary-item">
                <div className="summary-value" style={{ color: 'var(--gray-900)' }}>{total}</div>
                <div className="summary-label">Total</div>
              </div>
              <div className="summary-item">
                <div className="summary-value" style={{ color: 'var(--success)' }}>{inStock}</div>
                <div className="summary-label">In Stock</div>
              </div>
              <div className="summary-item">
                <div className="summary-value" style={{ color: 'var(--warning)' }}>{lowStock}</div>
                <div className="summary-label">Low Stock</div>
              </div>
              <div className="summary-item">
                <div className="summary-value" style={{ color: 'var(--danger)' }}>{outOfStock}</div>
                <div className="summary-label">Out of Stock</div>
              </div>
            </div>
            {total > 0 && (
              <>
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
                    <span>Completion</span>
                    <span>{Math.round((inStock / total) * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(inStock / total) * 100}%` }} />
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="card-header" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Audit Items ({total})</h3>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No audit items yet</div>
            <div className="empty-state-subtitle">Audit items will appear here once the merchandiser records them.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Qty Found</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Photo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 500 }}>{item.product?.name || item.product_id}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{item.qty_found}</td>
                  <td><Badge variant={statusBadge[item.status]}>{statusLabel[item.status]}</Badge></td>
                  <td style={{ color: 'var(--gray-500)' }}>{item.notes || '—'}</td>
                  <td>
                    {item.photo_url ? (
                      <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={item.photo_url} alt="photo" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--gray-200)' }} />
                      </a>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>
    </div>
  );
}
