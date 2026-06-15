import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '../hooks/useAppDispatch';
import { fetchVisits } from '../store/slices/visitsSlice';
import { fetchStores } from '../store/slices/storesSlice';
import { fetchProducts } from '../store/slices/productsSlice';
import { fetchUsers } from '../store/slices/usersSlice';
import PageHeader from '../components/ui/PageHeader';
import { formatDate } from '../utils/format';
import Badge from '../components/ui/Badge';
import type { AuditStatus } from '../types';

const statusBadge: Record<string, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const { items: visits } = useAppSelector((s) => s.visits);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: users } = useAppSelector((s) => s.users);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(fetchVisits(undefined));
    dispatch(fetchStores());
    dispatch(fetchProducts());
    if (['super_admin', 'admin'].includes(user?.role || '')) {
      dispatch(fetchUsers());
    }
  }, [dispatch, user]);

  const openVisits = visits.filter((v) => v.status === 'open').length;

  const stats = [
    { label: 'Total Stores', value: stores.length, icon: '🏪', color: 'primary' as const },
    { label: 'Total Products', value: products.length, icon: '📦', color: 'success' as const },
    { label: 'Total Visits', value: visits.length, icon: '📋', color: 'warning' as const },
    { label: 'Open Visits', value: openVisits, icon: '🔴', color: 'danger' as const },
  ];

  return (
    <div>
      <PageHeader
        title={`Good day, ${user?.full_name?.split(' ')[0] || 'User'} 👋`}
        subtitle="Here's what's happening in your inventory today."
      />

      <div className="stats-grid">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="stat-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
          >
            <div className={`stat-icon stat-icon-${stat.color}`}>
              <span style={{ fontSize: '22px' }}>{stat.icon}</span>
            </div>
            <div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.3 }}
      >
        <div className="card-header">
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gray-800)' }}>
            Recent Visits
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {visits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">No visits yet</div>
              <div className="empty-state-subtitle">Visits will appear here once merchandisers check in.</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Status</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                </tr>
              </thead>
              <tbody>
                {visits.slice(0, 10).map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.store?.name || v.store_id}</td>
                    <td>
                      <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                        {v.status === 'open' ? 'Open' : 'Closed'}
                      </Badge>
                    </td>
                    <td style={{ color: 'var(--gray-500)' }}>{formatDate(v.checkin_at)}</td>
                    <td style={{ color: 'var(--gray-500)' }}>
                      {v.checkout_at ? formatDate(v.checkout_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
