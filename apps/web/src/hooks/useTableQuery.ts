import { useCallback, useMemo, useState } from 'react';
import type { SortDir } from '../components/ui/DataTable';

export interface TableQuery {
  page: number;
  limit: number;
  search: string;
  sort_by?: string;
  sort_dir: SortDir;
  filters: Record<string, string>;
}

interface Options {
  limit?: number;
  sort_by?: string;
  sort_dir?: SortDir;
  filters?: Record<string, string>;
}

/**
 * Owns the search / filter / sort / pagination state for a table.
 *
 * Any change that alters *which* rows match resets back to page 1 — otherwise a
 * user filtering while on page 5 would land on an empty page.
 */
export function useTableQuery(options: Options = {}) {
  const [query, setQuery] = useState<TableQuery>({
    page: 1,
    limit: options.limit ?? 20,
    search: '',
    sort_by: options.sort_by,
    sort_dir: options.sort_dir ?? 'desc',
    filters: options.filters ?? {},
  });

  const setPage = useCallback((page: number) => {
    setQuery((q) => ({ ...q, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setQuery((q) => ({ ...q, limit, page: 1 }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setQuery((q) => ({ ...q, search, page: 1 }));
  }, []);

  const setSort = useCallback((sort_by: string, sort_dir: SortDir) => {
    setQuery((q) => ({ ...q, sort_by, sort_dir }));
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setQuery((q) => ({ ...q, filters: { ...q.filters, [key]: value }, page: 1 }));
  }, []);

  const reset = useCallback(() => {
    setQuery((q) => ({
      ...q,
      page: 1,
      search: '',
      filters: Object.fromEntries(Object.keys(q.filters).map((k) => [k, ''])),
    }));
  }, []);

  /**
   * The shape sent to the API: empty filters are dropped so they don't become
   * `?role=` and get rejected by the enum validator.
   */
  const params = useMemo(() => {
    const active = Object.entries(query.filters).filter(([, v]) => v !== '');
    return {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      sort_by: query.sort_by,
      sort_dir: query.sort_dir,
      ...Object.fromEntries(active),
    };
  }, [query]);

  return { query, params, setPage, setLimit, setSearch, setSort, setFilter, reset };
}
