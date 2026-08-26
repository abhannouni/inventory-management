import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import { fetchActiveVisit } from '../../store/slices/visitsSlice';
import { fetchUpcomingPlanned } from '../../store/slices/visitPlansSlice';
import StatusBar from '../../components/charts/StatusBar';
import { GreetingHeader, StatCard, DashCard, TimeTracker } from './shared';
import { VisitIcon, CheckCircleIcon, TargetIcon, AlertIcon, CalendarIcon } from './icons';
import { aggregateStockTotals, availabilityPct, visitsSince, recentVisits } from './metrics';
import { formatDate, formatDateOnly } from '../../utils/format';

const CHART_FILL = ['light', 'primary', 'accent', 'primary', 'light', 'medium', 'light'] as const;

function WeeklyCheckins({ dates }: { dates: string[] }) {
  const { t } = useTranslation('dashboard');
  const chartDays = t('weekDaysShort', { returnObjects: true }) as string[];
  const today = new Date().getDay();
  const counts = chartDays.map((_, i) => dates.filter((d) => new Date(d).getDay() === i).length);
  const max = Math.max(...counts, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, marginTop: 4 }}>
      {counts.map((val, i) => {
        const pct = Math.max((val / max) * 100, 4);
        const isToday = i === today;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ flex: 1, width: '100%', background: 'var(--gray-100)', borderRadius: 6, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
              <motion.div
                style={{
                  width: '100%',
                  borderRadius: 6,
                  background: isToday
                    ? 'var(--primary)'
                    : CHART_FILL[i] === 'medium'
                    ? 'var(--primary-medium)'
                    : CHART_FILL[i] === 'accent'
                    ? 'var(--accent)'
                    : CHART_FILL[i] === 'light'
                    ? 'repeating-linear-gradient(45deg,var(--gray-200),var(--gray-200) 2px,transparent 2px,transparent 7px)'
                    : 'var(--primary)',
                }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              />
            </div>
            <span style={{ fontSize: 11, color: isToday ? 'var(--primary)' : 'var(--gray-400)', fontWeight: isToday ? 700 : 500 }}>
              {chartDays[i]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function MerchandiserDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { visitsReport } = useAppSelector((s) => s.reports);
  const activeVisit = useAppSelector((s) => s.visits.active);
  const { upcoming: schedules } = useAppSelector((s) => s.visitPlans);

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
    dispatch(fetchActiveVisit());
    dispatch(fetchUpcomingPlanned());
  }, [dispatch]);

  const totals = useMemo(() => aggregateStockTotals(visitsReport), [visitsReport]);
  const availability = availabilityPct(totals);
  const thisWeek = useMemo(() => visitsSince(visitsReport, 7), [visitsReport]);
  const completedThisWeek = useMemo(() => thisWeek.filter((v) => v.status === 'completed').length, [thisWeek]);
  const latest = useMemo(() => recentVisits(visitsReport, 5), [visitsReport]);
  const upcoming = useMemo(
    () => [...schedules]
      .sort((a, b) => `${a.planned_date}${a.planned_time ?? ''}`.localeCompare(`${b.planned_date}${b.planned_time ?? ''}`))
      .slice(0, 4),
    [schedules],
  );

  const statusLabels = {
    inStock: t('legend.inStock'),
    stockDisponible: t('legend.stockDisponible'),
    lowStock: t('legend.lowStock'),
    outOfStock: t('legend.outOfStock'),
  };

  return (
    <div>
      <GreetingHeader subtitle={t('merchandiser.subtitle')} />

      <div className="dashv2-hero-grid">
        <StatCard label={t('kpis.myVisits')} value={visitsReport.length} dark delay={0} change={t('kpis.myVisitsHint')} icon={<VisitIcon />} />
        <StatCard label={t('kpis.completedThisWeek')} value={completedThisWeek} delay={0.06} tone="teal" change={t('kpis.completedThisWeekHint')} icon={<CheckCircleIcon />} />
        <StatCard label={t('kpis.myScore')} value={availability} delay={0.12} tone="amber" change={t('kpis.myScoreHint')} icon={<TargetIcon />} />
        <StatCard label={t('kpis.myStockouts')} value={totals.outOfStock} delay={0.18} tone="rose" change={t('kpis.myStockoutsHint')} icon={<AlertIcon />} />
      </div>

      <div className="dashv2-grid-2">
        <DashCard title={t('merchandiser.weeklyTitle')} subtitle={t('merchandiser.weeklySubtitle')} delay={0.24}>
          <WeeklyCheckins dates={visitsReport.map((v) => v.checkin_at)} />
        </DashCard>

        <DashCard title={t('merchandiser.myAuditsTitle')} subtitle={t('merchandiser.myAuditsSubtitle')} delay={0.28}>
          {totals.total === 0 ? (
            <p className="dashv2-card-empty">{t('merchandiser.noAudits')}</p>
          ) : (
            <StatusBar
              variant="block"
              labels={statusLabels}
              counts={{
                inStock: totals.inStock,
                stockDisponible: totals.stockDisponible,
                lowStock: totals.lowStock,
                outOfStock: totals.outOfStock,
              }}
            />
          )}
        </DashCard>
      </div>

      <div className="dashv2-grid-2">
        <div>
          <TimeTracker visit={activeVisit} />
          <div style={{ marginTop: 16 }}>
            <DashCard title={t('schedule.upcomingTitle')} subtitle={t('schedule.upcomingSubtitle')} action={{ label: t('team.viewAll'), onClick: () => navigate('/visits?tab=planning') }}>
              {upcoming.length === 0 ? (
                <p className="dashv2-card-empty">{t('schedule.empty')}</p>
              ) : (
                upcoming.map((s) => (
                  <div key={s.id} className="dashv2-mini-row">
                    <span className="dashv2-mini-icon"><CalendarIcon /></span>
                    <div className="dashv2-mini-info">
                      <div className="dashv2-mini-title">{s.store?.name ?? '—'}</div>
                      <div className="dashv2-mini-meta">{formatDateOnly(s.planned_date.slice(0, 10), i18n.language)}{s.planned_time && ` · ${s.planned_time}`}</div>
                    </div>
                  </div>
                ))
              )}
            </DashCard>
          </div>
        </div>

        <DashCard title={t('recentVisits.title')} subtitle={t('merchandiser.recentSubtitle')} action={{ label: t('recentVisits.seeAll'), onClick: () => navigate('/visits') }}>
          {latest.length === 0 ? (
            <p className="dashv2-card-empty">{t('recentVisits.empty')}</p>
          ) : (
            latest.map((v) => (
              <div
                key={v.id}
                className="quick-list-item"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/visits/${v.id}`)}
              >
                <div className="quick-dot" style={{ background: v.status === 'open' ? 'var(--success)' : 'var(--gray-300)' }} />
                <div className="quick-list-info">
                  <div className="quick-list-name">{v.store?.name ?? '—'}</div>
                  <div className="quick-list-meta">{formatDate(v.checkin_at, i18n.language)}</div>
                </div>
              </div>
            ))
          )}
        </DashCard>
      </div>
    </div>
  );
}
