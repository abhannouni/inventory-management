import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import { fetchActiveVisit } from '../../store/slices/visitsSlice';
import { fetchSchedules } from '../../store/slices/schedulesSlice';
import ChartCard from '../../components/charts/ChartCard';
import DonutChart from '../../components/charts/DonutChart';
import BarChart from '../../components/charts/BarChart';
import { STATUS } from '../../components/charts/tokens';
import Badge from '../../components/ui/Badge';
import { GreetingHeader, StatCard, SectionTitle, DashCard, TimeTracker } from './shared';
import { AVATAR_COLORS } from './constants';
import { StoreIcon, VisitIcon, TargetIcon, AlertIcon, CalendarIcon } from './icons';
import {
  aggregateStockTotals,
  availabilityPct,
  stockoutsByStore,
  visitsSince,
  recentVisits,
} from './metrics';
import { formatDate, formatDateOnly } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';

export default function SupervisorDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { visitsReport } = useAppSelector((s) => s.reports);
  const activeVisit = useAppSelector((s) => s.visits.active);
  const { items: schedules } = useAppSelector((s) => s.schedules);

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
    dispatch(fetchActiveVisit());
    dispatch(fetchSchedules({ status: 'pending' }));
  }, [dispatch]);

  const totals = useMemo(() => aggregateStockTotals(visitsReport), [visitsReport]);
  const availability = availabilityPct(totals);
  const myStores = useMemo(() => new Set(visitsReport.map((v) => v.store?.id).filter(Boolean)).size, [visitsReport]);
  const checkinsThisWeek = useMemo(() => visitsSince(visitsReport, 7).length, [visitsReport]);
  const topStockoutStores = useMemo(() => stockoutsByStore(visitsReport, 6), [visitsReport]);
  const teamActivity = useMemo(() => recentVisits(visitsReport, 6), [visitsReport]);
  const upcoming = useMemo(
    () => [...schedules].sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).slice(0, 5),
    [schedules],
  );

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

  return (
    <div>
      <GreetingHeader subtitle={t('supervisor.subtitle')} />

      <div className="dashv2-hero-grid">
        <StatCard label={t('kpis.myStores')} value={myStores} dark delay={0} change={t('kpis.myStoresHint')} icon={<StoreIcon />} />
        <StatCard label={t('kpis.teamCheckins')} value={checkinsThisWeek} delay={0.06} tone="teal" change={t('kpis.teamCheckinsHint')} icon={<VisitIcon />} />
        <StatCard label={t('kpis.availability')} value={availability} delay={0.12} tone="amber" change={t('kpis.availabilityHint')} icon={<TargetIcon />} />
        <StatCard label={t('kpis.openIssues')} value={totals.outOfStock} delay={0.18} tone="rose" change={t('kpis.openIssuesHint')} icon={<AlertIcon />} />
      </div>

      <div className="dashv2-grid-2">
        <ChartCard title={t('charts.stockHealth.title')} subtitle={t('charts.stockHealth.myStoresSubtitle')} dataset={stockDataset}
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

      <SectionTitle>{t('supervisor.sectionTitle')}</SectionTitle>

      <div className="dashv2-grid-2">
        <DashCard title={t('supervisor.teamActivityTitle')} subtitle={t('supervisor.teamActivitySubtitle')} action={{ label: t('team.viewAll'), onClick: () => navigate('/visits') }}>
          {teamActivity.length === 0 ? (
            <p className="dashv2-card-empty">{t('team.empty')}</p>
          ) : (
            teamActivity.map((v, i) => (
              <motion.div
                key={v.id}
                className="team-row"
                style={{ cursor: 'pointer' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                onClick={() => navigate(`/visits/${v.id}`)}
              >
                <div className="team-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {(v.user?.full_name ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="team-info">
                  <div className="team-name">{v.user?.full_name ?? '—'}</div>
                  <div className="team-role">{v.store?.name} · {formatDate(v.checkin_at, i18n.language)}</div>
                </div>
                <Badge variant={v.status === 'open' ? 'success' : 'gray'} dot>
                  {v.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                </Badge>
              </motion.div>
            ))
          )}
        </DashCard>

        <div>
          <TimeTracker visit={activeVisit} />
          <div style={{ marginTop: 16 }}>
            <DashCard title={t('schedule.upcomingTitle')} subtitle={t('schedule.upcomingSubtitle')} action={{ label: t('team.viewAll'), onClick: () => navigate('/schedule') }}>
              {upcoming.length === 0 ? (
                <p className="dashv2-card-empty">{t('schedule.empty')}</p>
              ) : (
                upcoming.map((s) => (
                  <div key={s.id} className="dashv2-mini-row">
                    <span className="dashv2-mini-icon"><CalendarIcon /></span>
                    <div className="dashv2-mini-info">
                      <div className="dashv2-mini-title">{s.store?.name ?? '—'}</div>
                      <div className="dashv2-mini-meta">{s.user?.full_name ? `${s.user.full_name} · ` : ''}{formatDateOnly(s.scheduled_at, i18n.language)}</div>
                    </div>
                  </div>
                ))
              )}
            </DashCard>
          </div>
        </div>
      </div>
    </div>
  );
}
