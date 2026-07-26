import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchUsers } from '../../store/slices/usersSlice';
import ChartCard from '../../components/charts/ChartCard';
import DonutChart from '../../components/charts/DonutChart';
import TrendChart from '../../components/charts/TrendChart';
import BarChart from '../../components/charts/BarChart';
import { STATUS } from '../../components/charts/tokens';
import StatusBar from '../../components/charts/StatusBar';
import { GreetingHeader, StatCard, SectionTitle } from './shared';
import { StoreIcon, ProductIcon, UsersIcon, AlertIcon, TargetIcon } from './icons';
import {
  aggregateStockTotals,
  availabilityPct,
  outOfStockPct,
  stockoutsByStore,
  stockoutTrend,
  healthByRegion,
  recentStockoutVisits,
} from './metrics';
import { formatDate } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';
import type { VisitReport } from '../../types';

export default function SuperAdminDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { visitsReport } = useAppSelector((s) => s.reports);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);
  const { meta: usersMeta } = useAppSelector((s) => s.users);

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
    dispatch(fetchStores());
    dispatch(fetchProducts());
    dispatch(fetchUsers({ limit: 1 }));
  }, [dispatch]);

  const totals = useMemo(() => aggregateStockTotals(visitsReport), [visitsReport]);
  const availability = availabilityPct(totals);
  const oosRate = outOfStockPct(totals);

  const topStockoutStores = useMemo(() => stockoutsByStore(visitsReport, 8), [visitsReport]);
  const trend = useMemo(() => stockoutTrend(visitsReport, 14, i18n.language), [visitsReport, i18n.language]);
  const regionHealth = useMemo(() => healthByRegion(visitsReport), [visitsReport]);
  const recentStockouts = useMemo(() => recentStockoutVisits(visitsReport, 6), [visitsReport]);

  const statusLabels = {
    inStock: t('legend.inStock'),
    stockDisponible: t('legend.stockDisponible'),
    lowStock: t('legend.lowStock'),
    outOfStock: t('legend.outOfStock'),
  };

  const stockDataset: ExportDataset<{ label: string; count: number; pct: number }> = {
    name: t('charts.stockHealth.title'),
    columns: [
      { header: t('charts.status'), value: (r) => r.label },
      { header: t('charts.count'), value: (r) => r.count },
      { header: t('charts.share'), value: (r) => r.pct },
    ],
    rows: [
      { label: statusLabels.inStock, count: totals.inStock, pct: totals.total ? Math.round((totals.inStock / totals.total) * 100) : 0 },
      { label: statusLabels.stockDisponible, count: totals.stockDisponible, pct: totals.total ? Math.round((totals.stockDisponible / totals.total) * 100) : 0 },
      { label: statusLabels.lowStock, count: totals.lowStock, pct: totals.total ? Math.round((totals.lowStock / totals.total) * 100) : 0 },
      { label: statusLabels.outOfStock, count: totals.outOfStock, pct: oosRate },
    ],
  };

  const trendDataset: ExportDataset<(typeof trend)[number]> = {
    name: t('charts.stockoutTrend.title'),
    columns: [
      { header: t('charts.date'), value: (r) => r.label },
      { header: t('charts.stockoutCount'), value: (r) => r.value },
    ],
    rows: trend,
  };

  const storesDataset: ExportDataset<(typeof topStockoutStores)[number]> = {
    name: t('charts.storesAttention.title'),
    columns: [
      { header: t('charts.store'), value: (r) => r.label },
      { header: t('charts.stockoutCount'), value: (r) => r.value },
      { header: t('charts.visits'), value: (r) => r.visits },
    ],
    rows: topStockoutStores,
  };

  const regionDataset: ExportDataset<(typeof regionHealth)[number]> = {
    name: t('charts.regionalHealth.title'),
    columns: [
      { header: t('charts.region'), value: (r) => r.label },
      { header: t('charts.availability'), value: (r) => r.value },
    ],
    rows: regionHealth,
  };

  const stockoutVisitsDataset: ExportDataset<VisitReport> = {
    name: t('charts.recentStockouts.title'),
    columns: [
      { header: t('charts.store'), value: (v) => v.store?.name ?? '' },
      { header: t('charts.date'), value: (v) => v.checkin_at },
      { header: t('charts.stockoutCount'), value: (v) => v.summary?.outOfStock ?? 0 },
      { header: t('charts.merchandiser'), value: (v) => v.user?.full_name ?? '' },
    ],
    rows: recentStockouts,
  };

  return (
    <div>
      <GreetingHeader subtitle={t('superAdmin.subtitle')} />

      <div className="dashv2-hero-grid">
        <StatCard
          label={t('kpis.stores')}
          value={stores.length}
          dark
          delay={0}
          change={t('kpis.storesHint')}
          icon={<StoreIcon />}
        />
        <StatCard
          label={t('kpis.products')}
          value={products.length}
          delay={0.06}
          tone="teal"
          change={t('kpis.productsHint')}
          icon={<ProductIcon />}
        />
        <StatCard
          label={t('kpis.users')}
          value={usersMeta.total}
          delay={0.12}
          tone="violet"
          change={t('kpis.usersHint')}
          icon={<UsersIcon />}
        />
        <StatCard
          label={t('kpis.availability')}
          value={availability}
          delay={0.18}
          tone="amber"
          change={t('kpis.availabilityHint')}
          icon={<TargetIcon />}
        />
        <StatCard
          label={t('kpis.stockouts')}
          value={totals.outOfStock}
          delay={0.24}
          tone="rose"
          change={t('kpis.stockoutsHint', { pct: oosRate })}
          icon={<AlertIcon />}
        />
      </div>

      <SectionTitle>{t('superAdmin.sectionTitle')}</SectionTitle>

      <div className="dashv2-grid-2">
        <ChartCard
          title={t('charts.stockHealth.title')}
          subtitle={t('charts.stockHealth.subtitle')}
          dataset={stockDataset}
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

        <ChartCard
          title={t('charts.stockoutTrend.title')}
          subtitle={t('charts.stockoutTrend.subtitle')}
          dataset={trendDataset}
        >
          <TrendChart data={trend} unit={` ${t('charts.stockoutUnit')}`} />
        </ChartCard>
      </div>

      <div className="dashv2-grid-2">
        <ChartCard
          title={t('charts.storesAttention.title')}
          subtitle={t('charts.storesAttention.subtitle')}
          dataset={storesDataset}
        >
          <BarChart
            data={topStockoutStores.map((s) => ({
              label: s.label,
              value: s.value,
              hint: t('charts.storeHint', { visits: s.visits }),
            }))}
          />
        </ChartCard>

        <ChartCard
          title={t('charts.regionalHealth.title')}
          subtitle={t('charts.regionalHealth.subtitle')}
          dataset={regionDataset}
        >
          <BarChart maxValue={100} unit="%" data={regionHealth} />
        </ChartCard>
      </div>

      <ChartCard
        title={t('charts.recentStockouts.title')}
        subtitle={t('charts.recentStockouts.subtitle')}
        dataset={stockoutVisitsDataset}
      >
        {recentStockouts.length === 0 ? (
          <p className="dashv2-card-empty">{t('charts.recentStockouts.empty')}</p>
        ) : (
          <div className="visit-rows">
            {recentStockouts.map((v) => (
              <div key={v.id} className="visit-row" onClick={() => navigate(`/visits/${v.id}`)} style={{ cursor: 'pointer' }}>
                <div className="visit-row-main">
                  <span className="visit-row-store">{v.store?.name}</span>
                  <span className="visit-row-meta">
                    {formatDate(v.checkin_at, i18n.language)}
                    {v.user?.full_name ? ` · ${v.user.full_name}` : ''}
                  </span>
                </div>
                <div className="visit-row-bar">
                  <StatusBar
                    labels={statusLabels}
                    counts={{
                      inStock: v.summary?.inStock ?? 0,
                      stockDisponible: v.summary?.stockDisponible ?? 0,
                      lowStock: v.summary?.lowStock ?? 0,
                      outOfStock: v.summary?.outOfStock ?? 0,
                    }}
                  />
                </div>
                <span className="visit-row-pct">{v.summary?.outOfStock ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
