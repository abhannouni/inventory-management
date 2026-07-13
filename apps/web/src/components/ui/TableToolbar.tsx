import { useTranslation } from 'react-i18next';
import SearchInput from './SearchInput';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
}

interface TableToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDef[];
  onFilterChange?: (key: string, value: string) => void;
  onReset?: () => void;
}

/**
 * Search + advanced filters above a table. An empty filter value means
 * "no constraint", so it maps to omitting the query param entirely.
 */
export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters = [],
  onFilterChange,
  onReset,
}: TableToolbarProps) {
  const { t } = useTranslation('common');

  const isFiltered = !!search || filters.some((f) => f.value !== '');

  return (
    <div className="table-toolbar">
      <div className="table-toolbar-search">
        <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />
      </div>

      <div className="table-toolbar-filters">
        {filters.map((f) => (
          <select
            key={f.key}
            className={`form-select toolbar-filter ${f.value ? 'is-active' : ''}`}
            value={f.value}
            aria-label={f.label}
            onChange={(e) => onFilterChange?.(f.key, e.target.value)}
          >
            <option value="">{f.label}</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ))}

        {isFiltered && onReset && (
          <button type="button" className="toolbar-reset" onClick={onReset}>
            {t('filters.reset')}
          </button>
        )}
      </div>
    </div>
  );
}
