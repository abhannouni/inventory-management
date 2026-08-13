import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { downloadCsv, downloadPptx, downloadXlsx } from '../../utils/export';
import { useChartRegistry } from './useChartExport';
import { usePermissions } from '../../hooks/usePermissions';

interface ReportDownloadMenuProps {
  /** File name stem for the combined workbook / deck. */
  fileName: string;
}

/**
 * The page-level "download exactly what I want" picker.
 *
 * Every chart currently on screen registers itself in the ChartExportContext;
 * this menu lists them as checkboxes and lets the reader pick a subset before
 * choosing a format — raw data as CSV or Excel, or the picked charts as a
 * PowerPoint deck (one slide per chart, snapshotted as it renders).
 */
export default function ReportDownloadMenu({ fileName }: ReportDownloadMenuProps) {
  const { t } = useTranslation('reports');
  const { isSuperAdmin } = usePermissions();
  const charts = useChartRegistry();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<'csv' | 'xlsx' | 'pptx' | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  const ids = useMemo(() => charts.map((c) => c.id).join('|'), [charts]);

  // Default to "everything currently on screen" whenever the set of charts changes
  // (new tab, filters revealing/hiding a card) — never carry a stale selection over.
  // Adjusted during render (React's documented pattern for resetting state when a
  // derived key changes) rather than in an effect, so it never causes an extra paint.
  const [prevIds, setPrevIds] = useState(ids);
  if (ids !== prevIds) {
    setPrevIds(ids);
    setSelected(new Set(charts.map((c) => c.id)));
  }

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

  const picked = charts.filter((c) => selected.has(c.id));
  const rowCount = picked.reduce((n, c) => n + c.dataset.rows.length, 0);
  const noneSelected = picked.length === 0;
  const disabled = charts.length === 0;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === charts.length ? new Set() : new Set(charts.map((c) => c.id))));
  };

  const handleCsv = () => {
    picked.forEach((c) => downloadCsv(c.dataset));
    setOpen(false);
  };

  const handleXlsx = async () => {
    setBusy('xlsx');
    try {
      await downloadXlsx(picked.map((c) => c.dataset), fileName);
      setOpen(false);
    } catch {
      toast.error(t('download.failed'));
    } finally {
      setBusy(null);
    }
  };

  const handlePptx = async () => {
    setBusy('pptx');
    try {
      await downloadPptx(
        picked.map((c) => ({ title: c.title, subtitle: c.subtitle, node: c.getNode() })),
        fileName,
        { coverSubtitle: t('download.pptxCoverSubtitle'), unavailable: t('download.pptxUnavailable') },
      );
      setOpen(false);
    } catch {
      toast.error(t('download.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="dl dl-report" ref={ref}>
      <button
        type="button"
        className="dl-trigger dl-md"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        title={disabled ? t('download.noData') : t('download.pickerLabel')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{t('download.pickerLabel')}</span>
      </button>

      {open && (
        <div className="dl-menu dl-menu-wide" role="menu">
          <div className="dl-picker-head">
            <span>{t('download.chooseWhat')}</span>
            <button type="button" className="dl-picker-toggle-all" onClick={toggleAll}>
              {selected.size === charts.length ? t('download.selectNone') : t('download.selectAll')}
            </button>
          </div>

          <ul className="dl-picker-list">
            {charts.map((c) => (
              <li key={c.id} className="dl-picker-item">
                <label>
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                  />
                  <span>{c.title}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="dl-picker-formats">
            <div className="dl-picker-group-label">{t('download.rawDataGroup')}</div>
            <button type="button" className="dl-item" role="menuitem" onClick={handleCsv} disabled={noneSelected}>
              <span className="dl-item-name">{t('download.csv')}</span>
              <span className="dl-item-hint">{t('download.csvHint')}</span>
            </button>
            <button
              type="button"
              className="dl-item"
              role="menuitem"
              onClick={handleXlsx}
              disabled={noneSelected || busy !== null}
            >
              <span className="dl-item-name">
                {busy === 'xlsx' ? t('download.preparing') : t('download.excel')}
              </span>
              <span className="dl-item-hint">{t('download.excelHint')}</span>
            </button>

            <div className="dl-picker-group-label">{t('download.chartsGroup')}</div>
            <button
              type="button"
              className="dl-item"
              role="menuitem"
              onClick={handlePptx}
              disabled={noneSelected || busy !== null}
            >
              <span className="dl-item-name">
                {busy === 'pptx' ? t('download.preparing') : t('download.pptx')}
              </span>
              <span className="dl-item-hint">{t('download.pptxHint')}</span>
            </button>
          </div>

          <div className="dl-foot">{t('download.rowCount', { count: rowCount })}</div>
        </div>
      )}
    </div>
  );
}
