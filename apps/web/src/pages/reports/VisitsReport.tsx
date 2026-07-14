import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisitsReport } from '../../store/slices/reportsSlice';
import Spinner from '../../components/ui/Spinner';
import ChartCard from '../../components/charts/ChartCard';
import DownloadDataButton from '../../components/charts/DownloadDataButton';
import StatTile from '../../components/charts/StatTile';
import TrendChart from '../../components/charts/TrendChart';
import BarChart from '../../components/charts/BarChart';
import StatusBar from '../../components/charts/StatusBar';
import { STATUS } from '../../components/charts/tokens';
import ReportFilters from './ReportFilters';
import { formatDate } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';
import type { VisitReport } from '../../types';

export default function VisitsReport() {
  const { t, i18n } = useTranslation('reports');
  const { t: tStores } = useTranslation('stores');
  const dispatch = useAppDispatch();
  const { visitsReport, loading } = useAppSelector((s) => s.reports);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchVisitsReport(undefined));
  }, [dispatch]);

  const apply = async () => {
    const res = await dispatch(
      fetchVisitsReport({ from: from || undefined, to: to || undefined }),
    );
    if (fetchVisitsReport.rejected.match(res)) {
      toast.error((res.payload as string) || t('visitsReport.loadErrorToast'));
    }
  };

  const reset = () => {
    setFrom('');
    setTo('');
    dispatch(fetchVisitsReport(undefined));
  };

  const statusLabels = {
    inStock: t('visitsReport.summary.inStock'),
    lowStock: t('visitsReport.summary.lowStock'),
    outOfStock: t('visitsReport.summary.outOfStock'),
  };

  /* ── Derived series ───────────────────────────────────────────────────── */

  const totals = useMemo(() => {
    const acc = { visits: 0, audited: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    for (const v of visitsReport) {
      acc.visits += 1;
      acc.audited += v.summary?.total ?? 0;
      acc.inStock += v.summary?.inStock ?? 0;
      acc.lowStock += v.summary?.lowStock ?? 0;
      acc.outOfStock += v.summary?.outOfStock ?? 0;
    }
    return acc;
  }, [visitsReport]);

  const availability =
    totals.audited === 0 ? 0 : Math.round((totals.inStock / totals.audited) * 100);
  const oosRate =
    totals.audited === 0 ? 0 : Math.round((totals.outOfStock / totals.audited) * 100);

  /** Visits per day, oldest → newest, so the line reads left-to-right in time. */
  const trend = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const v of visitsReport) {
      const day = String(v.checkin_at).slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({
        day,
        label: new Date(day).toLocaleDateString(i18n.language, {
          day: 'numeric',
          month: 'short',
        }),
        value: count,
      }));
  }, [visitsReport, i18n.language]);

  /** Availability by point of sale, worst first — the stores that need attention. */
  const byStore = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        brand: string;
        channel: string;
        classification: string;
        city: string;
        audited: number;
        inStock: number;
        visits: number;
      }
    >();

    for (const v of visitsReport) {
      const id = v.store?.id ?? 'unknown';
      const row = map.get(id) ?? {
        name: v.store?.name ?? t('visitsReport.unknownStore'),
        // The POS profile travels with the numbers: a brand or channel breakdown
        // is the first thing anyone asks for once these fields exist.
        brand: v.store?.brand ?? '',
        channel: v.store?.channel ?? '',
        classification: v.store?.classification ?? '',
        city: v.store?.city ?? '',
        audited: 0,
        inStock: 0,
        visits: 0,
      };
      row.audited += v.summary?.total ?? 0;
      row.inStock += v.summary?.inStock ?? 0;
      row.visits += 1;
      map.set(id, row);
    }

    return [...map.values()]
      .map((r) => ({
        ...r,
        availability: r.audited === 0 ? 0 : Math.round((r.inStock / r.audited) * 100),
      }))
      .sort((a, b) => a.availability - b.availability);
  }, [visitsReport, t]);

  /* ── Export datasets: exactly the rows each chart was drawn from ───────── */

  const visitsDataset: ExportDataset<VisitReport> = {
    name: t('visitsReport.datasets.visits'),
    columns: [
      { header: t('table.store'), value: (v) => v.store?.name ?? '' },
      { header: t('table.merchandiser'), value: (v) => v.user?.full_name ?? '' },
      { header: t('table.checkin'), value: (v) => v.checkin_at },
      { header: t('table.checkout'), value: (v) => v.checkout_at ?? '' },
      { header: t('table.status'), value: (v) => v.status },
      { header: t('visitsReport.summary.total'), value: (v) => v.summary?.total ?? 0 },
      { header: t('visitsReport.summary.inStock'), value: (v) => v.summary?.inStock ?? 0 },
      { header: t('visitsReport.summary.lowStock'), value: (v) => v.summary?.lowStock ?? 0 },
      { header: t('visitsReport.summary.outOfStock'), value: (v) => v.summary?.outOfStock ?? 0 },
      { header: t('visitsReport.availability'), value: (v) => v.summary?.completionPct ?? 0 },
    ],
    rows: visitsReport,
  };

  const trendDataset: ExportDataset<(typeof trend)[number]> = {
    name: t('visitsReport.datasets.trend'),
    columns: [
      { header: t('table.date'), value: (r) => r.day },
      { header: t('visitsReport.datasets.visitCount'), value: (r) => r.value },
    ],
    rows: trend,
  };

  const storeDataset: ExportDataset<(typeof byStore)[number]> = {
    name: t('visitsReport.datasets.byStore'),
    columns: [
      { header: t('table.store'), value: (r) => r.name },
      { header: t('table.brand'), value: (r) => r.brand },
      { header: t('table.channel'), value: (r) => (r.channel ? tStores(`channel.${r.channel}`) : '') },
      { header: t('table.classification'), value: (r) => r.classification },
      { header: t('table.city'), value: (r) => r.city },
      { header: t('visitsReport.datasets.visitCount'), value: (r) => r.visits },
      { header: t('visitsReport.summary.total'), value: (r) => r.audited },
      { header: t('visitsReport.summary.inStock'), value: (r) => r.inStock },
      { header: t('visitsReport.availability'), value: (r) => r.availability },
    ],
    rows: byStore,
  };

  const statusDataset: ExportDataset<{ label: string; count: number; pct: number }> = {
    name: t('visitsReport.datasets.stockStatus'),
    columns: [
      { header: t('table.status'), value: (r) => r.label },
      { header: t('visitsReport.datasets.productCount'), value: (r) => r.count },
      { header: t('visitsReport.datasets.share'), value: (r) => r.pct },
    ],
    rows: [
      { label: statusLabels.inStock, count: totals.inStock, pct: availability },
      {
        label: statusLabels.lowStock,
        count: totals.lowStock,
        pct: totals.audited ? Math.round((totals.lowStock / totals.audited) * 100) : 0,
      },
      { label: statusLabels.outOfStock, count: totals.outOfStock, pct: oosRate },
    ],
  };

  if (loading && visitsReport.length === 0) return <Spinner center size="lg" />;

  return (
    <div className={loading ? 'is-refetching' : undefined}>
      {/* One filter row above everything it scopes — never per-chart filters. */}
      <ReportFilters
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        onApply={apply}
        onReset={reset}
        actions={
          <DownloadDataButton
            size="md"
            datasets={[visitsDataset, trendDataset, storeDataset, statusDataset]}
            fileName={t('visitsReport.datasets.workbook')}
          />
        }
      />

      {visitsReport.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">{t('visitsReport.emptyTitle')}</div>
          <div className="empty-state-subtitle">{t('visitsReport.emptySubtitle')}</div>
        </div>
      ) : (
        <motion.div
          className="report-grid"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* The headline numbers are numbers — not one-bar charts. */}
          <div className="kpi-row">
            <StatTile label={t('visitsReport.kpis.visits')} value={totals.visits} />
            <StatTile label={t('visitsReport.kpis.audited')} value={totals.audited} />
            <StatTile
              label={t('visitsReport.kpis.availability')}
              value={availability}
              unit="%"
              tone={availability >= 90 ? 'good' : availability >= 75 ? 'warning' : 'critical'}
              hint={t('visitsReport.kpis.availabilityHint')}
            />
            <StatTile
              label={t('visitsReport.kpis.outOfStock')}
              value={oosRate}
              unit="%"
              tone={oosRate <= 5 ? 'good' : oosRate <= 15 ? 'warning' : 'critical'}
              hint={t('visitsReport.kpis.outOfStockHint')}
            />
          </div>

          <ChartCard
            title={t('visitsReport.charts.trendTitle')}
            subtitle={t('visitsReport.charts.trendSub')}
            dataset={trendDataset}
          >
            <TrendChart data={trend} />
          </ChartCard>

          <ChartCard
            title={t('visitsReport.charts.statusTitle')}
            subtitle={t('visitsReport.charts.statusSub')}
            dataset={statusDataset}
            legend={[
              { label: statusLabels.inStock, color: STATUS.in_stock },
              { label: statusLabels.lowStock, color: STATUS.low_stock },
              { label: statusLabels.outOfStock, color: STATUS.out_of_stock },
            ]}
          >
            <StatusBar
              variant="block"
              labels={statusLabels}
              counts={{
                inStock: totals.inStock,
                lowStock: totals.lowStock,
                outOfStock: totals.outOfStock,
              }}
            />
          </ChartCard>

          <ChartCard
            title={t('visitsReport.charts.storeTitle')}
            subtitle={t('visitsReport.charts.storeSub')}
            dataset={storeDataset}
          >
            <BarChart
              maxValue={100}
              unit="%"
              data={byStore.map((s) => ({
                label: s.name,
                value: s.availability,
                hint: t('visitsReport.charts.storeHint', {
                  visits: s.visits,
                  audited: s.audited,
                }),
              }))}
            />
          </ChartCard>

          <ChartCard
            title={t('visitsReport.charts.visitsTitle')}
            subtitle={t('visitsReport.charts.visitsSub')}
            dataset={visitsDataset}
          >
            <div className="visit-rows">
              {visitsReport.map((v) => (
                <div key={v.id} className="visit-row">
                  <div className="visit-row-main">
                    <span className="visit-row-store">{v.store?.name}</span>
                    <span className="visit-row-meta">
                      {formatDate(v.checkin_at, i18n.language)}
                      {v.user?.full_name ? ` · ${v.user.full_name}` : ''}
                    </span>
                  </div>

                  {v.summary && v.summary.total > 0 ? (
                    <div className="visit-row-bar">
                      <StatusBar
                        labels={statusLabels}
                        counts={{
                          inStock: v.summary.inStock,
                          lowStock: v.summary.lowStock,
                          outOfStock: v.summary.outOfStock,
                        }}
                      />
                    </div>
                  ) : (
                    <span className="visit-row-none">{t('visitsReport.noAudit')}</span>
                  )}

                  <span className="visit-row-pct">{v.summary?.completionPct ?? 0}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </motion.div>
      )}
    </div>
  );
}
