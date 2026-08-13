import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { downloadCsv, downloadPptx, downloadXlsx } from '../../utils/export';
import type { AnyExportDataset } from '../../utils/export';
import { usePermissions } from '../../hooks/usePermissions';

interface DownloadDataButtonProps {
  /** The rows behind the chart. Several datasets export as one multi-sheet workbook. */
  datasets: AnyExportDataset[];
  /** File name stem; defaults to the first dataset's name. */
  fileName?: string;
  /** `sm` sits in a chart-card header; `md` sits in a page header. */
  size?: 'sm' | 'md';
  /** When set, adds a "PowerPoint" option that snapshots this one chart onto a slide. */
  chartNode?: () => HTMLElement | null;
  chartTitle?: string;
  chartSubtitle?: string;
}

export default function DownloadDataButton({
  datasets,
  fileName,
  size = 'sm',
  chartNode,
  chartTitle,
  chartSubtitle,
}: DownloadDataButtonProps) {
  const { t } = useTranslation('reports');
  const { isSuperAdmin } = usePermissions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Downloading data off the platform is a super-admin-only action.
  if (!isSuperAdmin) return null;

  const rowCount = datasets.reduce((n, d) => n + d.rows.length, 0);
  const disabled = rowCount === 0;

  const handleCsv = () => {
    // CSV is a single table by definition; several datasets need the workbook.
    datasets.forEach((d) => downloadCsv(d));
    setOpen(false);
  };

  const handleXlsx = async () => {
    setBusy(true);
    try {
      await downloadXlsx(datasets, fileName ?? datasets[0]?.name ?? 'report');
      setOpen(false);
    } catch {
      toast.error(t('download.failed'));
    } finally {
      setBusy(false);
    }
  };

  const handlePptx = async () => {
    if (!chartNode) return;
    setBusy(true);
    try {
      await downloadPptx(
        [{ title: chartTitle ?? fileName ?? '', subtitle: chartSubtitle, node: chartNode() }],
        fileName ?? chartTitle ?? 'chart',
        { coverSubtitle: t('download.pptxCoverSubtitle'), unavailable: t('download.pptxUnavailable') },
      );
      setOpen(false);
    } catch {
      toast.error(t('download.failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dl" ref={ref}>
      <button
        type="button"
        className={`dl-trigger dl-${size}`}
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? t('download.noData') : t('download.label')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{t('download.label')}</span>
      </button>

      {open && (
        <div className="dl-menu" role="menu">
          <button type="button" className="dl-item" role="menuitem" onClick={handleCsv}>
            <span className="dl-item-name">{t('download.csv')}</span>
            <span className="dl-item-hint">{t('download.csvHint')}</span>
          </button>
          <button
            type="button"
            className="dl-item"
            role="menuitem"
            onClick={handleXlsx}
            disabled={busy}
          >
            <span className="dl-item-name">
              {busy ? t('download.preparing') : t('download.excel')}
            </span>
            <span className="dl-item-hint">{t('download.excelHint')}</span>
          </button>
          {chartNode && (
            <button
              type="button"
              className="dl-item"
              role="menuitem"
              onClick={handlePptx}
              disabled={busy}
            >
              <span className="dl-item-name">
                {busy ? t('download.preparing') : t('download.pptx')}
              </span>
              <span className="dl-item-hint">{t('download.pptxHint')}</span>
            </button>
          )}
          <div className="dl-foot">{t('download.rowCount', { count: rowCount })}</div>
        </div>
      )}
    </div>
  );
}
