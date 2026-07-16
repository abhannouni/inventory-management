import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from './Spinner';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
  hideOnMobile?: boolean;
  /** Enables the sort control on this column. The `key` is sent as `sort_by`. */
  sortable?: boolean;
}

export type SortDir = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
  sortBy?: string;
  sortDir?: SortDir;
  /** Provide together with `sortBy` to make sortable headers interactive. */
  onSortChange?: (key: string, dir: SortDir) => void;
  /** Applied to the <tr>, e.g. to dim deactivated rows. */
  rowClassName?: (row: T) => string | undefined;
}

function SortIcon({ state }: { state: 'none' | SortDir }) {
  return (
    <span className={`sort-icon sort-${state}`} aria-hidden="true">
      <svg width="10" height="12" viewBox="0 0 10 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 1.5 L8 4.5 M5 1.5 L2 4.5" className="sort-up" />
        <path d="M5 10.5 L8 7.5 M5 10.5 L2 7.5" className="sort-down" />
      </svg>
    </span>
  );
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  keyExtractor,
  emptyMessage,
  sortBy,
  sortDir = 'desc',
  onSortChange,
  rowClassName,
}: DataTableProps<T>) {
  const { t } = useTranslation('common');
  if (loading) return <Spinner center size="lg" />;

  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSortChange) return;
    // Re-clicking the active column flips direction; a new column starts ascending.
    const next: SortDir = sortBy === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSortChange(col.key, next);
  };

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sortBy === col.key;
              const interactive = col.sortable && !!onSortChange;

              return (
                <th
                  key={col.key}
                  className={[
                    col.hideOnMobile ? 'hide-mobile' : '',
                    interactive ? 'is-sortable' : '',
                    active ? 'is-sorted' : '',
                    col.key === 'actions' ? 'col-actions' : '',
                  ].filter(Boolean).join(' ') || undefined}
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {interactive ? (
                    <button type="button" className="th-sort" onClick={() => handleSort(col)}>
                      {col.header}
                      <SortIcon state={active ? sortDir : 'none'} />
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">
                  {emptyMessage || t('table.noData')}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <motion.tr
                  key={keyExtractor(row)}
                  className={rowClassName?.(row)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        col.hideOnMobile ? 'hide-mobile' : '',
                        col.key === 'actions' ? 'col-actions' : '',
                      ].filter(Boolean).join(' ') || undefined}
                    >
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '')}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
