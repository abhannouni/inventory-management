import { useTranslation } from 'react-i18next';
import type { PageMeta } from '../../types';

interface PaginationProps {
  meta: PageMeta;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

const LIMITS = [10, 20, 50, 100];

/** Compact page list with ellipses: 1 … 4 [5] 6 … 20 */
function pageList(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '…')[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);

  return pages;
}

export default function Pagination({ meta, onPageChange, onLimitChange }: PaginationProps) {
  const { t } = useTranslation('common');
  const { page, limit, total, total_pages, has_next, has_prev } = meta;

  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <div className="pagination-summary">
        {t('pagination.showing', { from, to, total })}
      </div>

      <div className="pagination-controls">
        {onLimitChange && (
          <label className="pagination-limit">
            <span>{t('pagination.perPage')}</span>
            <select
              className="form-select pagination-limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              {LIMITS.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
        )}

        <nav className="pagination-pages" aria-label={t('pagination.label')}>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page - 1)}
            disabled={!has_prev}
            aria-label={t('pagination.previous')}
          >
            ‹
          </button>

          {pageList(page, total_pages).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="pagination-gap">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pagination-btn ${p === page ? 'active' : ''}`}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            className="pagination-btn"
            onClick={() => onPageChange(page + 1)}
            disabled={!has_next}
            aria-label={t('pagination.next')}
          >
            ›
          </button>
        </nav>
      </div>
    </div>
  );
}
