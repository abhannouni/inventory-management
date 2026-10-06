import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ordersApi, type OrderListItem, type OrderStatus } from '../../api/orders.api';
import Button from '../../components/ui/Button';
import DataTable, { type Column, type SortDir } from '../../components/ui/DataTable';
import PageHeader from '../../components/ui/PageHeader';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { fetchStores } from '../../store/slices/storesSlice';
import type { Paginated } from '../../types';
import { formatDate } from '../../utils/format';
import { OrderStatusBadge } from './InvoiceDocument';
import { formatMoney } from './orderMath';
import './orders.css';

/** Every order the user may see, newest first — the "Passage de commande" module home. */
export default function OrdersPage() {
  const { t, i18n } = useTranslation('orders');
  const lang = i18n.language;
  const { can } = usePermissions();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { items: stores } = useAppSelector((s) => s.stores);
  const [params, setParams] = useSearchParams();

  // Filters live in the URL, so "View all orders" from a POS lands pre-filtered.
  const storeId = params.get('store') ?? '';
  const status = (params.get('status') ?? '') as OrderStatus | '';
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<{ by: string; dir: SortDir }>({ by: 'created_at', dir: 'desc' });
  const [data, setData] = useState<Paginated<OrderListItem> | null>(null);

  useEffect(() => {
    if (!stores.length) dispatch(fetchStores());
  }, [dispatch, stores.length]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    let current = true;
    ordersApi
      .list({ page, limit, search: debounced || undefined, store_id: storeId || undefined, status: status || undefined, sort_by: sort.by, sort_dir: sort.dir })
      .then((res) => current && setData(res))
      .catch(() => current && setData({ items: [], meta: { total: 0, page: 1, limit, total_pages: 1, has_next: false, has_prev: false } }));
    return () => {
      current = false;
    };
  }, [page, limit, debounced, storeId, status, sort]);

  const setFilter = (key: 'store' | 'status', value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const hasFilters = !!(search || storeId || status);

  const columns: Column<OrderListItem>[] = [
    {
      key: 'number',
      header: t('table.order'),
      sortable: true,
      render: (o) => (
        <div>
          <Link to={`/orders/${o.id}`} className="ord-number">{o.number}</Link>
          {o.invoice && <div className="ord-muted">{o.invoice.number}</div>}
        </div>
      ),
    },
    {
      key: 'store',
      header: t('table.store'),
      render: (o) =>
        o.store ? (
          <div>
            <div>{o.store.name}</div>
            {o.store.city && <div className="ord-muted">{o.store.city}</div>}
          </div>
        ) : (
          <span className="ord-muted">{t('table.deletedStore')}</span>
        ),
    },
    {
      key: 'created_at',
      header: t('table.date'),
      sortable: true,
      hideOnMobile: true,
      render: (o) => (
        <div>
          <div>{formatDate(o.created_at, lang)}</div>
          {o.created_by && <div className="ord-muted">{o.created_by.full_name}</div>}
        </div>
      ),
    },
    { key: 'items', header: t('table.items'), hideOnMobile: true, render: (o) => <span className="ord-num">{o._count.items}</span> },
    { key: 'total_ht', header: t('table.totalHt'), hideOnMobile: true, render: (o) => <span className="ord-num">{formatMoney(o.total_ht, lang)}</span> },
    {
      key: 'total_ttc',
      header: t('table.totalTtc'),
      sortable: true,
      render: (o) => <strong className="ord-num">{formatMoney(o.total_ttc, lang)}</strong>,
    },
    { key: 'status', header: t('table.status'), render: (o) => <OrderStatusBadge status={o.status} /> },
    {
      key: 'actions',
      header: '',
      render: (o) => (
        <Link to={`/orders/${o.id}`} className="btn btn-ghost btn-sm">
          {t('table.viewInvoice')}
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          can('orders.create') ? (
            <Button onClick={() => navigate(storeId ? `/orders/new?store=${storeId}` : '/orders/new')}>
              + {t('newOrder')}
            </Button>
          ) : undefined
        }
      />

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 340 }}>
          <input
            className="form-input"
            placeholder={t('filters.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          placeholder={t('filters.allStores')}
          value={storeId}
          onChange={(e) => setFilter('store', e.target.value)}
          style={{ minWidth: 180 }}
        />
        <Select
          options={(['confirmed', 'cancelled'] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))}
          placeholder={t('filters.allStatuses')}
          value={status}
          onChange={(e) => setFilter('status', e.target.value)}
          style={{ minWidth: 160 }}
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('');
              setParams({}, { replace: true });
              setPage(1);
            }}
          >
            {t('filters.clear')}
          </Button>
        )}
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={!data}
          keyExtractor={(o) => o.id}
          emptyMessage={t('table.empty')}
          sortBy={sort.by}
          sortDir={sort.dir}
          onSortChange={(by, dir) => {
            setSort({ by, dir });
            setPage(1);
          }}
          rowClassName={(o) => (o.status === 'cancelled' ? 'ord-row-cancelled' : undefined)}
        />
        {data && (
          <Pagination
            meta={data.meta}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
