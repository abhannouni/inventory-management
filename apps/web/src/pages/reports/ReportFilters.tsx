import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../../components/ui/Button';

interface ReportFiltersProps {
  from: string;
  to: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onApply: () => void;
  onReset: () => void;
  /** Extra controls (a store/product picker, the download button). */
  children?: ReactNode;
  actions?: ReactNode;
}

/**
 * One filter row, above everything it scopes — every chart on the tab re-renders
 * against the same slice. Filters never live inside a chart card.
 */
export default function ReportFilters({
  from,
  to,
  onFrom,
  onTo,
  onApply,
  onReset,
  children,
  actions,
}: ReportFiltersProps) {
  const { t } = useTranslation('reports');
  const isFiltered = !!from || !!to;

  return (
    <div className="report-filters">
      <div className="report-filters-fields">
        {children}

        <label className="rf-field">
          <span className="rf-label">{t('filters.from')}</span>
          <input
            type="date"
            className="form-input"
            value={from}
            max={to || undefined}
            onChange={(e) => onFrom(e.target.value)}
          />
        </label>

        <label className="rf-field">
          <span className="rf-label">{t('filters.to')}</span>
          <input
            type="date"
            className="form-input"
            value={to}
            min={from || undefined}
            onChange={(e) => onTo(e.target.value)}
          />
        </label>

        <div className="rf-buttons">
          <Button size="sm" onClick={onApply}>{t('filters.apply')}</Button>
          {isFiltered && (
            <Button size="sm" variant="ghost" onClick={onReset}>{t('filters.reset')}</Button>
          )}
        </div>
      </div>

      {actions && <div className="report-filters-actions">{actions}</div>}
    </div>
  );
}
