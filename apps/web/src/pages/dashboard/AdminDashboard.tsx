import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import ChartCard from '../../components/charts/ChartCard';
import DonutChart from '../../components/charts/DonutChart';
import BarChart from '../../components/charts/BarChart';
import TrendChart from '../../components/charts/TrendChart';
import { STATUS } from '../../components/charts/tokens';
import Badge from '../../components/ui/Badge';
import { GreetingHeader, StatCard, SectionTitle, DashCard } from './shared';
import { StoreIcon, ProductIcon, UsersIcon, TargetIcon } from './icons';
import {
  aggregateStockTotals,
  availabilityPct,
  stockoutsByStore,
  visitsTrend,
} from './metrics';
import type { ExportDataset } from '../../utils/export';

export default function AdminDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { visitsReport } = useAppSelector((s) => s.reports);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: users, meta: usersMeta } = useAppSelector((s) => s.users);

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
    dispatch(fetchStores());
    dispatch(fetchProducts());
    dispatch(fetchUsers({ limit: 5, sort_by: 'created_at', sort_dir: 'desc' }));
  }, [dispatch]);

  const totals = useMemo(() => aggregateStockTotals(visitsReport), [visitsReport]);
  const availability = availabilityPct(totals);
  const topStockoutStores = useMemo(() => stockoutsByStore(visitsReport, 6), [visitsReport]);
  const activityTrend = useMemo(() => visitsTrend(visitsReport, 14, i18n.language), [visitsReport, i18n.language]);

  const statusLabels = {
    inStock: t('legend.inStock'),
    stockDisponible: t('legend.stockDisponible'),
    lowStock: t('legend.lowStock'),
    outOfStock: t('legend.outOfStock'),
  };

  const stockDataset: ExportDataset<{ label: string; count: number }> = {
    name: t('charts.stockHealth.title'),
    columns: [
      { header: t('charts.status'), value: (r) => r.label },
      { header: t('charts.count'), value: (r) => r.count },
    ],
    rows: [
      { label: statusLabels.inStock, count: totals.inStock },
      { label: statusLabels.stockDisponible, count: totals.stockDisponible },
      { label: statusLabels.lowStock, count: totals.lowStock },
      { label: statusLabels.outOfStock, count: totals.outOfStock },
    ],
  };

  const storesDataset: ExportDataset<(typeof topStockoutStores)[number]> = {
    name: t('charts.storesAttention.title'),
    columns: [
      { header: t('charts.store'), value: (r) => r.label },
      { header: t('charts.stockoutCount'), value: (r) => r.value },
    ],
    rows: topStockoutStores,
  };

  const trendDataset: ExportDataset<(typeof activityTrend)[number]> = {
    name: t('charts.visitActivityTrend.title'),
    columns: [
      { header: t('charts.date'), value: (r) => r.label },
      { header: t('charts.visits'), value: (r) => r.value },
    ],
    rows: activityTrend,
  };

  const quickActions = [
    { label: t('quickActions.manageUsers'), icon: <UsersIcon />, path: '/users' },
    { label: t('quickActions.manageStores'), icon: <StoreIcon />, path: '/stores' },
    { label: t('quickActions.manageStock'), icon: <ProductIcon />, path: '/product-stores' },
    { label: t('quickActions.schedule'), icon: <TargetIcon />, path: '/schedule' },
  ];

  return (
    <div>
      <GreetingHeader subtitle={t('admin.subtitle')} />

      <div className="dashv2-hero-grid">
        <StatCard label={t('kpis.stores')} value={stores.length} dark delay={0} change={t('kpis.storesHint')} icon={<StoreIcon />} />
        <StatCard label={t('kpis.products')} value={products.length} delay={0.06} tone="teal" change={t('kpis.productsHint')} icon={<ProductIcon />} />
        <StatCard label={t('kpis.teamMembers')} value={usersMeta.total} delay={0.12} tone="violet" change={t('kpis.teamMembersHint')} icon={<UsersIcon />} />
        <StatCard label={t('kpis.availability')} value={availability} delay={0.18} tone="amber" change={t('kpis.availabilityHint')} icon={<TargetIcon />} />
      </div>

      <div className="dashv2-grid-2">
        <ChartCard title={t('charts.stockHealth.title')} subtitle={t('charts.stockHealth.subtitle')} dataset={stockDataset}
          legend={[
            { label: statusLabels.inStock, color: STATUS.in_stock },
            { label: statusLabels.stockDisponible, color: STATUS.stock_disponible },
            { label: statusLabels.lowStock, color: STATUS.low_stock },
            { label: statusLabels.outOfStock, color: STATUS.out_of_stock },
          ]}
        >
          <DonutChart
            centerValue={`${availability}%`}
            centerLabel={t('charts.stockHealth.centerLabel')}
            data={[
              { label: statusLabels.inStock, value: totals.inStock, color: STATUS.in_stock },
              { label: statusLabels.stockDisponible, value: totals.stockDisponible, color: STATUS.stock_disponible },
              { label: statusLabels.lowStock, value: totals.lowStock, color: STATUS.low_stock },
              { label: statusLabels.outOfStock, value: totals.outOfStock, color: STATUS.out_of_stock },
            ]}
          />
        </ChartCard>

        <ChartCard title={t('charts.storesAttention.title')} subtitle={t('charts.storesAttention.subtitle')} dataset={storesDataset}>
          <BarChart data={topStockoutStores.map((s) => ({ label: s.label, value: s.value }))} />
        </ChartCard>
      </div>

      <ChartCard title={t('charts.visitActivityTrend.title')} subtitle={t('charts.visitActivityTrend.subtitle')} dataset={trendDataset}>
        <TrendChart data={activityTrend} unit={` ${t('charts.visitsUnit')}`} />
      </ChartCard>

      <SectionTitle>{t('admin.sectionTitle')}</SectionTitle>

      <div className="dashv2-grid-2">
        <DashCard title={t('team.titleMembers')} subtitle={t('admin.teamSubtitle')} action={{ label: t('team.viewAll'), onClick: () => navigate('/users') }}>
          {users.length === 0 ? (
            <p className="dashv2-card-empty">{t('team.empty')}</p>
          ) : (
            users.slice(0, 5).map((u, i) => (
              <motion.div
                key={u.id}
                className="team-row"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <div className="team-avatar" style={{ background: 'var(--primary)' }}>
                  {u.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="team-info">
                  <div className="team-name">{u.full_name}</div>
                  <div className="team-role">{tCommon(`roles.${u.role}`)}</div>
                </div>
                <Badge variant={u.role === 'merchandiser' ? 'success' : u.role === 'supervisor' ? 'warning' : 'primary'}>
                  {tCommon(`roles.${u.role}`)}
                </Badge>
              </motion.div>
            ))
          )}
        </DashCard>

        <DashCard title={t('quickActions.title')} subtitle={t('quickActions.subtitle')}>
          <div className="dashv2-actions-grid">
            {quickActions.map((a) => (
              <button key={a.path} className="dashv2-action-btn" onClick={() => navigate(a.path)}>
                <span className="dashv2-action-icon">{a.icon}</span>
                <span className="dashv2-action-label">{a.label}</span>
              </button>
            ))}
          </div>
        </DashCard>
      </div>
    </div>
  );
}
