import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import DownloadDataButton from './DownloadDataButton';
import { useRegisterChart } from './useChartExport';
import type { AnyExportDataset, ExportColumn } from '../../utils/export';

export interface LegendItem {
  label: string;
  color: string;
  /** Status series ship an icon so meaning is never carried by colour alone. */
  icon?: ReactNode;
}

interface ChartCardProps {
  /**
   * Unique within the page — keys this chart into the page-level download picker.
   * Optional: dashboards that don't wrap in a ChartExportProvider have nothing to
   * register with, so falling back to the title is enough to keep the prop terse
   * on pages that only need the per-card CSV/Excel download.
   */
  id?: string;
  title: string;
  subtitle?: string;
  legend?: LegendItem[];
  /** The rows the chart was drawn from — powers both the table view and the download. */
  dataset: AnyExportDataset;
  children: ReactNode;
}

/**
 * The frame every chart sits in.
 *
 * It guarantees the three things a chart must never ship without: a legend when
 * there is more than one series, a table view of the same numbers (so no value is
 * gated behind a tooltip or a colour), and a download of the exact rows plotted.
 */
export default function ChartCard({
  id,
  title,
  subtitle,
  legend,
  dataset,
  children,
}: ChartCardProps) {
  const { t } = useTranslation('reports');
  const [showTable, setShowTable] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useRegisterChart(id ?? title, title, subtitle, dataset, captureRef);

  return (
    <section className="chart-card viz-root">
      <header className="chart-card-head">
        <div className="chart-card-titles">
          <h3 className="chart-card-title">{title}</h3>
          {subtitle && <p className="chart-card-sub">{subtitle}</p>}
        </div>

        <div className="chart-card-actions">
          <button
            type="button"
            className={`chart-toggle ${showTable ? 'is-active' : ''}`}
            onClick={() => setShowTable((v) => !v)}
            aria-pressed={showTable}
          >
            {showTable ? t('chart.showChart') : t('chart.showTable')}
          </button>
          <DownloadDataButton
            datasets={[dataset]}
            fileName={dataset.name}
            chartNode={() => captureRef.current}
            chartTitle={title}
            chartSubtitle={subtitle}
          />
        </div>
      </header>

      {/* Everything below the header is what gets captured for a PowerPoint slide —
          the toggle and download buttons never end up in the exported image. */}
      <div ref={captureRef} className="chart-card-capture">
        {/* A single series needs no legend — the title already names what is plotted. */}
        {legend && legend.length > 1 && !showTable && (
          <ul className="chart-legend">
            {legend.map((item) => (
              <li key={item.label} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: item.color }} />
                {item.icon && <span className="chart-legend-icon">{item.icon}</span>}
                <span className="chart-legend-label">{item.label}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="chart-card-body">
          {showTable ? <ChartTable dataset={dataset} /> : children}
        </div>
      </div>
    </section>
  );
}

/** The WCAG-clean twin of the chart: the same rows, as text. */
function ChartTable({ dataset }: { dataset: AnyExportDataset }) {
  const { t } = useTranslation('reports');

  if (dataset.rows.length === 0) {
    return <p className="chart-empty">{t('chart.noData')}</p>;
  }

  const isNumeric = (col: ExportColumn<unknown>) =>
    dataset.rows.length > 0 && typeof col.value(dataset.rows[0]) === 'number';

  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <thead>
          <tr>
            {dataset.columns.map((c) => (
              <th key={c.header} className={isNumeric(c) ? 'num' : undefined}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataset.rows.map((row, i) => (
            <tr key={i}>
              {dataset.columns.map((c) => {
                const v = c.value(row);
                return (
                  <td key={c.header} className={typeof v === 'number' ? 'num' : undefined}>
                    {v === null || v === undefined ? '—' : String(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
