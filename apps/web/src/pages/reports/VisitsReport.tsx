import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';

export default function VisitsReport() {
  const dispatch = useAppDispatch();
  const { visitsReport, loading } = useAppSelector((s) => s.reports);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => { dispatch(fetchVisitsReport(undefined)); }, [dispatch]);

  const handleFilter = async () => {
    const res = await dispatch(fetchVisitsReport({ from: from || undefined, to: to || undefined }));
    if (fetchVisitsReport.rejected.match(res)) toast.error(res.payload as string || 'Failed to load report');
  };

  const handleReset = () => {
    setFrom(''); setTo('');
    dispatch(fetchVisitsReport(undefined));
  };

  if (loading) return <Spinner center size="lg" />;

  return (
    <div>
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">From</label>
          <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">To</label>
          <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
          <Button onClick={handleFilter}>Apply</Button>
          <Button variant="ghost" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {visitsReport.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No visits found</div>
          <div className="empty-state-subtitle">Try adjusting the date filters.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visitsReport.map((v, i) => (
            <motion.div
              key={v.id}
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 600, fontSize: 15 }}>{v.store?.name || v.store_id}</h3>
                    <p style={{ color: 'var(--gray-500)', fontSize: 13 }}>{formatDate(v.checkin_at)}</p>
                  </div>
                  <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                    {v.status === 'open' ? 'Open' : 'Closed'}
                  </Badge>
                </div>

                {v.summary && (
                  <div className="summary-grid">
                    <div className="summary-item">
                      <div className="summary-value">{v.summary.total}</div>
                      <div className="summary-label">Total</div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-value" style={{ color: 'var(--success)' }}>{v.summary.inStock}</div>
                      <div className="summary-label">In Stock</div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-value" style={{ color: 'var(--warning)' }}>{v.summary.lowStock}</div>
                      <div className="summary-label">Low Stock</div>
                    </div>
                    <div className="summary-item">
                      <div className="summary-value" style={{ color: 'var(--danger)' }}>{v.summary.outOfStock}</div>
                      <div className="summary-label">Out of Stock</div>
                    </div>
                  </div>
                )}

                {v.summary && v.summary.total > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>
                      <span>Completion Rate</span>
                      <span style={{ fontWeight: 600 }}>{v.summary.completionPct}%</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${v.summary.completionPct}%`, background: v.summary.completionPct >= 80 ? 'var(--success)' : v.summary.completionPct >= 50 ? 'var(--warning)' : 'var(--danger)' }} />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
