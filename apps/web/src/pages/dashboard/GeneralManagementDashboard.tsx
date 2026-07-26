import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchSellOuts } from '../../store/slices/sellOutSlice';
import ChartCard from '../../components/charts/ChartCard';
import StatTile from '../../components/charts/StatTile';
import DonutChart from '../../components/charts/DonutChart';
import BarChart from '../../components/charts/BarChart';
import TrendChart from '../../components/charts/TrendChart';
import { STATUS } from '../../components/charts/tokens';
import Badge from '../../components/ui/Badge';
import { GreetingHeader, SectionTitle } from './shared';
import {
  aggregateStockTotals,
  availabilityPct,
  outOfStockPct,
  healthByRegion,
  availabilityTrend,
  recentVisits,
} from './metrics';
import { formatDate } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';

export default function GeneralManagementDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { visitsReport } = useAppSelector((s) => s.reports);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: sellOuts } = useAppSelector((s) => s.sellOut);

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
    dispatch(fetchStores());
    dispatch(fetchProducts());
    dispatch(fetchSellOuts());
  }, [dispatch]);

  const totals = useMemo(() => aggregateStockTotals(visitsReport), [visitsReport]);
  const availability = availabilityPct(totals);
  const oosRate = outOfStockPct(totals);
  const regionHealth = useMemo(() => healthByRegion(visitsReport), [visitsReport]);
  const trend = useMemo(() => availabilityTrend(visitsReport, 14, i18n.language), [visitsReport, i18n.language]);
  const latestVisits = useMemo(() => recentVisits(visitsReport, 6), [visitsReport]);
  const sellOutUnits = useMemo(() => sellOuts.reduce((sum, s) => sum + s.quantity, 0), [sellOuts]);

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

  const regionDataset: ExportDataset<(typeof regionHealth)[number]> = {
    name: t('charts.regionalHealth.title'),
    columns: [
      { header: t('charts.region'), value: (r) => r.label },
      { header: t('charts.availability'), value: (r) => r.value },
    ],
    rows: regionHealth,
  };

  const trendDataset: ExportDataset<(typeof trend)[number]> = {
    name: t('charts.availabilityTrend.title'),
    columns: [
      { header: t('charts.date'), value: (r) => r.label },
      { header: t('charts.availability'), value: (r) => r.value },
    ],
    rows: trend,
  };

  return (
    <div>
      <GreetingHeader subtitle={t('gm.subtitle')} />

      <div className="kpi-row" style={{ marginBottom: 24 }}>
        <StatTile label={t('kpis.stores')} value={stores.length} />
        <StatTile label={t('kpis.products')} value={products.length} />
        <StatTile
          label={t('kpis.availability')}
          value={availability}
          unit="%"
          tone={availability >= 90 ? 'good' : availability >= 75 ? 'warning' : 'critical'}
        />
        <StatTile
          label={t('kpis.outOfStockRate')}
          value={oosRate}
          unit="%"
          tone={oosRate <= 5 ? 'good' : oosRate <= 15 ? 'warning' : 'critical'}
        />
        <StatTile label={t('kpis.sellOutUnits')} value={sellOutUnits} />
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

        <ChartCard title={t('charts.regionalHealth.title')} subtitle={t('charts.regionalHealth.subtitle')} dataset={regionDataset}>
          <BarChart maxValue={100} unit="%" data={regionHealth} />
        </ChartCard>
      </div>

      <ChartCard title={t('charts.availabilityTrend.title')} subtitle={t('charts.availabilityTrend.subtitle')} dataset={trendDataset}>
        <TrendChart data={trend} unit="%" maxValue={100} />
      </ChartCard>

      <SectionTitle>{t('gm.sectionTitle')}</SectionTitle>

      <div className="dashv2-card">
        {latestVisits.length === 0 ? (
          <p className="dashv2-card-empty">{t('recentVisits.empty')}</p>
        ) : (
          <div className="visit-rows">
            {latestVisits.map((v) => (
              <div key={v.id} className="visit-row" onClick={() => navigate(`/visits/${v.id}`)} style={{ cursor: 'pointer' }}>
                <div className="visit-row-main">
                  <span className="visit-row-store">{v.store?.name}</span>
                  <span className="visit-row-meta">{formatDate(v.checkin_at, i18n.language)}</span>
                </div>
                <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                  {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                </Badge>
                <span className="visit-row-pct">{v.summary?.completionPct ?? 0}%</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
