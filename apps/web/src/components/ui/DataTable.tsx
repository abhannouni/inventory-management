import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import Spinner from './Spinner';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  width?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  keyExtractor: (row: T) => string;
  emptyMessage?: string;
}

export default function DataTable<T>({ columns, data, loading, keyExtractor, emptyMessage }: DataTableProps<T>) {
  const { t } = useTranslation('common');
  if (loading) return <Spinner center size="lg" />;

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={col.hideOnMobile ? 'hide-mobile' : undefined}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-empty">{emptyMessage || t('table.noData')}</td>
              </tr>
            ) : (
              data.map((row) => (
                <motion.tr
                  key={keyExtractor(row)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={col.hideOnMobile ? 'hide-mobile' : undefined}>
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
