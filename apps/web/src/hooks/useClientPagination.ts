import { useCallback, useMemo, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import type { PageMeta } from '../types';

const PAGE_SIZE_KEY = 'pagination:pageSize';

interface Options {
  defaultLimit?: number;
  /** Override the shared page-size preference with a page-specific one. */
  storageKey?: string;
}

/**
 * Paginates an already-fetched, already-filtered array on the client.
 *
 * Several list pages (Products, Stores, Regions, Roles) are also fetched in
 * full elsewhere to populate dropdowns, so their API endpoints can't switch to
 * paginated-by-default without breaking those consumers. Slicing client-side
 * gets the same UX without touching the fetch contract.
 */
export function useClientPagination<T>(items: T[], options: Options = {}) {
  const [limit, setStoredLimit] = useLocalStorage<number>(
    options.storageKey ?? PAGE_SIZE_KEY,
    options.defaultLimit ?? 20,
  );
  const [page, setPage] = useState(1);

  const total = items.length;
  const total_pages = Math.max(1, Math.ceil(total / limit));
  // Clamped rather than reset-on-filter-change, so a shrinking result set never renders a blank page.
  const safePage = Math.min(Math.max(1, page), total_pages);

  const setLimit = useCallback(
    (next: number) => {
      setStoredLimit(next);
      setPage(1);
    },
    [setStoredLimit],
  );

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * limit;
    return items.slice(start, start + limit);
  }, [items, safePage, limit]);

  const meta: PageMeta = {
    total,
    page: safePage,
    limit,
    total_pages,
    has_next: safePage < total_pages,
    has_prev: safePage > 1,
  };

  return { pageItems, meta, setPage, setLimit };
}
