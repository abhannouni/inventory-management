import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStoreReport } from '../../store/slices/reportsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import Spinner from '../../components/ui/Spinner';
import ChartCard from '../../components/charts/ChartCard';
import DownloadDataButton from '../../components/charts/DownloadDataButton';
import StatTile from '../../components/charts/StatTile';
import TrendChart from '../../components/charts/TrendChart';
import StatusBar from '../../components/charts/StatusBar';
import VarianceChart from '../../components/charts/VarianceChart';
import { STATUS } from '../../components/charts/tokens';
import ReportFilters from './ReportFilters';
import { formatDate } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';

export default function StoreReport() {
  const { t, i18n } = useTranslation('reports');
  const dispatch = useAppDispatch();
  const { storeReport, loading } = useAppSelector((s) => s.reports);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [storeId, setStoreId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchStores());
  }, [dispatch]);

  const load = async () => {
    if (!storeId) {
      toast.error(t('storeReport.selectStoreToast'));
      return;
    }
    const res = await dispatch(
      fetchStoreReport({
        id: storeId,
        filters: { from: from || undefined, to: to || undefined },
      }),
    );
    if (fetchStoreReport.rejected.match(res)) {
      toast.error((res.payload as string) || t('storeReport.loadErrorToast'));
    }
  };

  const reset = () => {
    setFrom('');
    setTo('');
    if (storeId) dispatch(fetchStoreReport({ id: storeId }));
  };

  const statusLabels = {
    inStock: t('visitsReport.summary.inStock'),
    lowStock: t('visitsReport.summary.lowStock'),
    outOfStock: t('visitsReport.summary.outOfStock'),
  };

  const visits = useMemo(() => storeReport?.visits ?? [], [storeReport]);

  const totals = useMemo(() => {
    const acc = { audited: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    for (const v of visits) {
      acc.audited += v.summary?.total ?? 0;
      acc.inStock += v.summary?.inStock ?? 0;
      acc.lowStock += v.summary?.lowStock ?? 0;
      acc.outOfStock += v.summary?.outOfStock ?? 0;
    }
    return acc;
  }, [visits]);

  const availability =
    totals.audited === 0 ? 0 : Math.round((totals.inStock / totals.audited) * 100);

  /** Availability per visit, oldest → newest: is this POS getting better or worse? */
  const trend = useMemo(
    () =>
      [...visits]
        .sort((a, b) => String(a.checkin_at).localeCompare(String(b.checkin_at)))
        .map((v) => ({
          date: String(v.checkin_at).slice(0, 10),
          label: new Date(v.checkin_at).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          }),
          value: v.summary?.completionPct ?? 0,
        })),
    [visits, i18n.language],
  );

  /**
   * Shelf gap on the most recent visit: found − expected, per product.
   * Diverging, because the reader's question is "which side of expected is it?" —
   * a plain bar chart cannot show that.
   */
  const variance = useMemo(() => {
    const latest = [...visits].sort((a, b) =>
      String(b.checkin_at).localeCompare(String(a.checkin_at)),
    )[0];

    return (latest?.audit_items ?? [])
      .map((ai) => ({
        label: ai.product?.name ?? '—',
        found: ai.qty_found,
        expected: ai.expected_qty ?? 0,
        variance: ai.variance ?? ai.qty_found - (ai.expected_qty ?? 0),
      }))
      .sort((a, b) => a.variance - b.variance);
  }, [visits]);

  /* ── Export datasets ──────────────────────────────────────────────────── */

  const itemsDataset: ExportDataset<{
    date: string;
    product: string;
    sku: string;
    found: number;
    expected: number;
    variance: number;
    status: string;
    notes: string;
  }> = {
    name: t('storeReport.datasets.items'),
    columns: [
      { header: t('table.date'), value: (r) => r.date },
      { header: t('storeReport.table.product'), value: (r) => r.product },
      { header: 'SKU', value: (r) => r.sku },
      { header: t('storeReport.table.qtyFound'), value: (r) => r.found },
      { header: t('storeReport.table.expected'), value: (r) => r.expected },
      { header: t('storeReport.table.variance'), value: (r) => r.variance },
      { header: t('table.status'), value: (r) => r.status },
      { header: t('productReport.table.notes'), value: (r) => r.notes },
    ],
    rows: visits.flatMap((v) =>
      (v.audit_items ?? []).map((ai) => ({
        date: String(v.checkin_at).slice(0, 10),
        product: ai.product?.name ?? '',
        sku: ai.product?.sku ?? '',
        found: ai.qty_found,
        expected: ai.expected_qty ?? 0,
        variance: ai.variance ?? ai.qty_found - (ai.expected_qty ?? 0),
        status: ai.status,
        notes: ai.notes ?? '',
      })),
    ),
  };

  const trendDataset: ExportDataset<(typeof trend)[number]> = {
    name: t('storeReport.datasets.trend'),
    columns: [
      { header: t('table.date'), value: (r) => r.date },
      { header: t('visitsReport.availability'), value: (r) => r.value },
    ],
    rows: trend,
  };

  const varianceDataset: ExportDataset<(typeof variance)[number]> = {
    name: t('storeReport.datasets.variance'),
    columns: [
      { header: t('storeReport.table.product'), value: (r) => r.label },
      { header: t('storeReport.table.qtyFound'), value: (r) => r.found },
      { header: t('storeReport.table.expected'), value: (r) => r.expected },
      { header: t('storeReport.table.variance'), value: (r) => r.variance },
    ],
    rows: variance,
  };

  const statusDataset: ExportDataset<{ label: string; count: number }> = {
    name: t('storeReport.datasets.status'),
    columns: [
      { header: t('table.status'), value: (r) => r.label },
      { header: t('visitsReport.datasets.productCount'), value: (r) => r.count },
    ],
    rows: [
      { label: statusLabels.inStock, count: totals.inStock },
      { label: statusLabels.lowStock, count: totals.lowStock },
      { label: statusLabels.outOfStock, count: totals.outOfStock },
    ],
  };

  return (
    <div className={loading ? 'is-refetching' : undefined}>
      <ReportFilters
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        onApply={load}
        onReset={reset}
        actions={
          storeReport ? (
            <DownloadDataButton
              size="md"
              datasets={[itemsDataset, trendDataset, varianceDataset, statusDataset]}
              fileName={`${storeReport.store.name} ${t('storeReport.datasets.workbook')}`}
            />
          ) : undefined
        }
      >
        <label className="rf-field rf-field-wide">
          <span className="rf-label">{t('storeReport.store')}</span>
          <select
            className="form-select"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            <option value="">{t('storeReport.selectStorePlaceholder')}</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      </ReportFilters>

      {loading && !storeReport && <Spinner center size="lg" />}

      {!loading && !storeReport && (
        <div className="empty-state">
          <div className="empty-state-title">{t('storeReport.emptyState')}</div>
        </div>
      )}

      {storeReport && (
        <motion.div
          className="report-grid"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="report-subject">
            <h2 className="report-subject-name">{storeReport.store.name}</h2>
            {storeReport.store.address && (
              <p className="report-subject-meta">{storeReport.store.address}</p>
            )}
          </div>

          <div className="kpi-row">
            <StatTile label={t('storeReport.kpis.visits')} value={visits.length} />
            <StatTile label={t('visitsReport.kpis.audited')} value={totals.audited} />
            <StatTile
              label={t('visitsReport.kpis.availability')}
              value={availability}
              unit="%"
              tone={availability >= 90 ? 'good' : availability >= 75 ? 'warning' : 'critical'}
            />
            <StatTile
              label={t('visitsReport.summary.outOfStock')}
              value={totals.outOfStock}
              tone={totals.outOfStock === 0 ? 'good' : 'critical'}
            />
          </div>

          {trend.length > 0 && (
            <ChartCard
              title={t('storeReport.charts.trendTitle')}
              subtitle={t('storeReport.charts.trendSub')}
              dataset={trendDataset}
            >
              <TrendChart data={trend} unit="%" maxValue={100} />
            </ChartCard>
          )}

          {totals.audited > 0 && (
            <ChartCard
              title={t('storeReport.charts.statusTitle')}
              subtitle={t('storeReport.charts.statusSub')}
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
          )}

          {variance.length > 0 && (
            <ChartCard
              title={t('storeReport.charts.varianceTitle')}
              subtitle={t('storeReport.charts.varianceSub')}
              dataset={varianceDataset}
            >
              <VarianceChart
                data={variance}
                labels={{
                  under: t('storeReport.charts.under'),
                  over: t('storeReport.charts.over'),
                }}
              />
            </ChartCard>
          )}

          <ChartCard
            title={t('storeReport.charts.historyTitle')}
            subtitle={t('storeReport.visitHistory', { count: visits.length })}
            dataset={itemsDataset}
          >
            <div className="visit-rows">
              {visits.map((v) => (
                <div key={v.id} className="visit-row">
                  <div className="visit-row-main">
                    <span className="visit-row-store">
                      {formatDate(v.checkin_at, i18n.language)}
                    </span>
                    <span className="visit-row-meta">
                      {v.user?.full_name ?? ''}
                      {' · '}
                      {t('storeReport.productsAudited', { count: v.summary?.total ?? 0 })}
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
