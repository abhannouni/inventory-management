import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProductReport } from '../../store/slices/reportsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import ChartCard from '../../components/charts/ChartCard';
import { ChartExportProvider } from '../../components/charts/ChartExportContext';
import ReportDownloadMenu from '../../components/charts/ReportDownloadMenu';
import StatTile from '../../components/charts/StatTile';
import TrendChart from '../../components/charts/TrendChart';
import BarChart from '../../components/charts/BarChart';
import StatusBar from '../../components/charts/StatusBar';
import DonutChart from '../../components/charts/DonutChart';
import { STATUS } from '../../components/charts/tokens';
import ReportFilters from './ReportFilters';
import { formatDate } from '../../utils/format';
import type { ExportDataset } from '../../utils/export';
import type { AuditStatus } from '../../types';
import { getProductClassificationLabel } from '../../utils/productClassification';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger' | 'primary'> = {
  in_stock: 'primary',
  stock_disponible: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function ProductReport() {
  const { t, i18n } = useTranslation('reports');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { productReport, loading } = useAppSelector((s) => s.reports);
  const { items: products } = useAppSelector((s) => s.products);

  const [productId, setProductId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const load = async () => {
    if (!productId) {
      toast.error(t('productReport.selectProductToast'));
      return;
    }
    const res = await dispatch(
      fetchProductReport({
        id: productId,
        filters: { from: from || undefined, to: to || undefined },
      }),
    );
    if (fetchProductReport.rejected.match(res)) {
      toast.error((res.payload as string) || t('productReport.loadErrorToast'));
    }
  };

  const reset = () => {
    setFrom('');
    setTo('');
    if (productId) dispatch(fetchProductReport({ id: productId }));
  };

  const statusLabels = {
    inStock: t('visitsReport.summary.inStock'),
    stockDisponible: t('visitsReport.summary.stockDisponible'),
    lowStock: t('visitsReport.summary.lowStock'),
    outOfStock: t('visitsReport.summary.outOfStock'),
  };

  const history = useMemo(() => productReport?.history ?? [], [productReport]);

  const counts = useMemo(() => {
    const acc = { inStock: 0, stockDisponible: 0, lowStock: 0, outOfStock: 0 };
    for (const h of history) {
      if (h.status === 'in_stock') acc.inStock += 1;
      else if (h.status === 'stock_disponible') acc.stockDisponible += 1;
      else if (h.status === 'low_stock') acc.lowStock += 1;
      else acc.outOfStock += 1;
    }
    return acc;
  }, [history]);

  const avgQty = useMemo(
    () =>
      history.length === 0
        ? 0
        : Math.round(history.reduce((s, h) => s + h.qty_found, 0) / history.length),
    [history],
  );

  const oosRate =
    history.length === 0 ? 0 : Math.round((counts.outOfStock / history.length) * 100);

  /** Quantity found over time — how this product's shelf presence moves. */
  const trend = useMemo(
    () =>
      [...history]
        .sort((a, b) => String(a.checkin_at).localeCompare(String(b.checkin_at)))
        .map((h) => ({
          date: String(h.checkin_at).slice(0, 10),
          label: new Date(h.checkin_at).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          }),
          value: h.qty_found,
          hint: h.store?.name,
        })),
    [history, i18n.language],
  );

  /** Average quantity found per point of sale — where does this product run dry? */
  const byStore = useMemo(() => {
    const map = new Map<string, { name: string; total: number; scans: number; oos: number }>();
    for (const h of history) {
      const key = h.store?.id ?? 'unknown';
      const row = map.get(key) ?? { name: h.store?.name ?? '—', total: 0, scans: 0, oos: 0 };
      row.total += h.qty_found;
      row.scans += 1;
      if (h.status === 'out_of_stock') row.oos += 1;
      map.set(key, row);
    }
    return [...map.values()]
      .map((r) => ({ ...r, avg: Math.round(r.total / r.scans) }))
      .sort((a, b) => a.avg - b.avg);
  }, [history]);

  /* ── Export datasets ──────────────────────────────────────────────────── */

  const historyDataset: ExportDataset<(typeof history)[number]> = {
    name: t('productReport.datasets.history'),
    columns: [
      { header: t('table.date'), value: (h) => String(h.checkin_at).slice(0, 10) },
      { header: t('productReport.table.store'), value: (h) => h.store?.name ?? '' },
      { header: t('productReport.table.qtyFound'), value: (h) => h.qty_found },
      { header: t('table.status'), value: (h) => h.status },
      { header: t('productReport.table.notes'), value: (h) => h.notes ?? '' },
    ],
    rows: history,
  };

  const trendDataset: ExportDataset<(typeof trend)[number]> = {
    name: t('productReport.datasets.trend'),
    columns: [
      { header: t('table.date'), value: (r) => r.date },
      { header: t('productReport.table.store'), value: (r) => r.hint ?? '' },
      { header: t('productReport.table.qtyFound'), value: (r) => r.value },
    ],
    rows: trend,
  };

  const storeDataset: ExportDataset<(typeof byStore)[number]> = {
    name: t('productReport.datasets.byStore'),
    columns: [
      { header: t('productReport.table.store'), value: (r) => r.name },
      { header: t('productReport.datasets.scans'), value: (r) => r.scans },
      { header: t('productReport.datasets.avgQty'), value: (r) => r.avg },
      { header: t('visitsReport.summary.outOfStock'), value: (r) => r.oos },
    ],
    rows: byStore,
  };

  return (
    <ChartExportProvider>
    <div className={loading ? 'is-refetching' : undefined}>
      <ReportFilters
        from={from}
        to={to}
        onFrom={setFrom}
        onTo={setTo}
        onApply={load}
        onReset={reset}
        actions={
          productReport ? (
            <ReportDownloadMenu
              fileName={`${productReport.product.name} ${t('productReport.datasets.workbook')}`}
            />
          ) : undefined
        }
      >
        <label className="rf-field rf-field-wide">
          <span className="rf-label">{t('productReport.product')}</span>
          <select
            className="form-select"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          >
            <option value="">{t('productReport.selectProductPlaceholder')}</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</option>
            ))}
          </select>
        </label>
      </ReportFilters>

      {loading && !productReport && <Spinner center size="lg" />}

      {!loading && !productReport && (
        <div className="empty-state">
          <div className="empty-state-title">{t('productReport.emptyState')}</div>
        </div>
      )}

      {productReport && (
        <motion.div
          className="report-grid"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="report-subject">
            <h2 className="report-subject-name">{productReport.product.name}</h2>
            <p className="report-subject-meta">
              <code className="report-sku">{productReport.product.sku}</code>
              <span>{productReport.product.category}</span>
              <Badge variant={productReport.product.is_our_product ? 'success' : 'gray'}>
                {getProductClassificationLabel(
                  productReport.product.is_our_product,
                  productReport.product.distributeur,
                )}
              </Badge>
            </p>
          </div>

          <div className="kpi-row">
            <StatTile label={t('productReport.totalScans')} value={history.length} />
            <StatTile label={t('productReport.datasets.avgQty')} value={avgQty} />
            <StatTile
              label={t('visitsReport.summary.lowStock')}
              value={counts.lowStock}
              tone={counts.lowStock === 0 ? 'good' : 'warning'}
            />
            <StatTile
              label={t('visitsReport.kpis.outOfStock')}
              value={oosRate}
              unit="%"
              tone={oosRate === 0 ? 'good' : oosRate <= 15 ? 'warning' : 'critical'}
              hint={t('productReport.oosHint', { count: counts.outOfStock })}
            />
          </div>

          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">{t('productReport.noHistory')}</div>
            </div>
          ) : (
            <>
              <ChartCard
                id="trend"
                title={t('productReport.charts.trendTitle')}
                subtitle={t('productReport.charts.trendSub')}
                dataset={trendDataset}
              >
                <TrendChart data={trend} />
              </ChartCard>

              <div className="chart-card-pair">
                <ChartCard
                  id="status"
                  title={t('productReport.charts.statusTitle')}
                  subtitle={t('productReport.charts.statusSub')}
                  dataset={{
                    name: t('productReport.datasets.status'),
                    columns: [
                      { header: t('table.status'), value: (r: { label: string; count: number }) => r.label },
                      { header: t('productReport.datasets.scans'), value: (r: { label: string; count: number }) => r.count },
                    ],
                    rows: [
                      { label: statusLabels.inStock, count: counts.inStock },
                      { label: statusLabels.stockDisponible, count: counts.stockDisponible },
                      { label: statusLabels.lowStock, count: counts.lowStock },
                      { label: statusLabels.outOfStock, count: counts.outOfStock },
                    ],
                  }}
                  legend={[
                    { label: statusLabels.inStock, color: STATUS.in_stock },
                    { label: statusLabels.stockDisponible, color: STATUS.stock_disponible },
                    { label: statusLabels.lowStock, color: STATUS.low_stock },
                    { label: statusLabels.outOfStock, color: STATUS.out_of_stock },
                  ]}
                >
                  <StatusBar variant="block" labels={statusLabels} counts={counts} />
                </ChartCard>

                <ChartCard
                  id="distribution"
                  title={t('productReport.charts.distributionTitle')}
                  subtitle={t('productReport.charts.distributionSub')}
                  dataset={{
                    name: t('productReport.datasets.status'),
                    columns: [
                      { header: t('table.status'), value: (r: { label: string; count: number }) => r.label },
                      { header: t('productReport.datasets.scans'), value: (r: { label: string; count: number }) => r.count },
                    ],
                    rows: [
                      { label: statusLabels.inStock, count: counts.inStock },
                      { label: statusLabels.stockDisponible, count: counts.stockDisponible },
                      { label: statusLabels.lowStock, count: counts.lowStock },
                      { label: statusLabels.outOfStock, count: counts.outOfStock },
                    ],
                  }}
                  legend={[
                    { label: statusLabels.inStock, color: STATUS.in_stock },
                    { label: statusLabels.stockDisponible, color: STATUS.stock_disponible },
                    { label: statusLabels.lowStock, color: STATUS.low_stock },
                    { label: statusLabels.outOfStock, color: STATUS.out_of_stock },
                  ]}
                >
                  <DonutChart
                    centerValue={history.length - counts.outOfStock}
                    centerLabel={t('productReport.datasets.scans')}
                    data={[
                      { label: statusLabels.inStock, value: counts.inStock, color: STATUS.in_stock },
                      { label: statusLabels.stockDisponible, value: counts.stockDisponible, color: STATUS.stock_disponible },
                      { label: statusLabels.lowStock, value: counts.lowStock, color: STATUS.low_stock },
                      { label: statusLabels.outOfStock, value: counts.outOfStock, color: STATUS.out_of_stock },
                    ]}
                  />
                </ChartCard>
              </div>

              <ChartCard
                id="store"
                title={t('productReport.charts.storeTitle')}
                subtitle={t('productReport.charts.storeSub')}
                dataset={storeDataset}
              >
                <BarChart
                  data={byStore.map((s) => ({
                    label: s.name,
                    value: s.avg,
                    hint: t('productReport.charts.storeHint', {
                      scans: s.scans,
                      oos: s.oos,
                    }),
                  }))}
                />
              </ChartCard>

              <ChartCard
                id="history"
                title={t('productReport.charts.historyTitle')}
                subtitle={t('productReport.charts.historySub')}
                dataset={historyDataset}
              >
                <div className="chart-table-wrap">
                  <table className="chart-table">
                    <thead>
                      <tr>
                        <th>{t('productReport.table.store')}</th>
                        <th>{t('productReport.table.date')}</th>
                        <th className="num">{t('productReport.table.qtyFound')}</th>
                        <th>{t('productReport.table.status')}</th>
                        <th>{t('productReport.table.notes')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.visit_id}>
                          <td>{h.store?.name || '—'}</td>
                          <td>{formatDate(h.checkin_at, i18n.language)}</td>
                          <td className="num">{h.qty_found}</td>
                          <td>
                            <Badge variant={statusBadge[h.status as AuditStatus]}>
                              {tCommon(`status.${h.status}`)}
                            </Badge>
                          </td>
                          <td>{h.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            </>
          )}
        </motion.div>
      )}
    </div>
    </ChartExportProvider>
  );
}
