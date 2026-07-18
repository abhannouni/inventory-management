import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchSellOuts, createSellOut } from '../../store/slices/sellOutSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Select from '../../components/ui/Select';
import Pagination from '../../components/ui/Pagination';
import SellOutForm from './SellOutForm';
import SellOutBulkImportModal from './SellOutBulkImportModal';
import SellOutExportModal from './SellOutExportModal';
import { formatDateOnly } from '../../utils/format';
import { getProductClassificationLabel, BOURCHANIN_CANONICAL_NAME } from '../../utils/productClassification';
import type { SellOut } from '../../types';

const CONCURRENT_LABEL = 'Concurrent';

export default function SellOutPage() {
  const { t, i18n } = useTranslation('sellOut');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items, loading } = useAppSelector((s) => s.sellOut);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('');
  const [storeFilter, setStoreFilter] = useState('');

  useEffect(() => { dispatch(fetchSellOuts()); }, [dispatch]);

  const classify = (row: SellOut) =>
    row.product ? getProductClassificationLabel(row.product.is_our_product, row.product.distributeur) : '';

  const storeOptions = useMemo(
    () =>
      Array.from(new Set(items.map((row) => row.store?.name).filter((v): v is string => !!v)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ value: v, label: v })),
    [items],
  );

  const classificationOptions = [
    { value: BOURCHANIN_CANONICAL_NAME, label: BOURCHANIN_CANONICAL_NAME },
    { value: CONCURRENT_LABEL, label: CONCURRENT_LABEL },
  ];

  const hasActiveFilters = !!search || !!classificationFilter || !!storeFilter;

  const clearFilters = () => {
    setSearch('');
    setClassificationFilter('');
    setStoreFilter('');
  };

  const filtered = items.filter((row) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      row.product?.name.toLowerCase().includes(q) ||
      row.product?.sku.toLowerCase().includes(q) ||
      row.store?.name.toLowerCase().includes(q);
    return matchesSearch && (!classificationFilter || classify(row) === classificationFilter) && (!storeFilter || row.store?.name === storeFilter);
  });

  const { pageItems, meta, setPage, setLimit } = useClientPagination(filtered, { storageKey: 'pagination:sellOut' });

  const handleCreate = async (data: { product_id: string; store_id: string; quantity: number; price: number }) => {
    const res = await dispatch(createSellOut(data));
    if (createSellOut.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error((res.payload as string) || t('toasts.createError'));
    }
  };

  const columns = [
    {
      key: 'product',
      header: t('table.product'),
      render: (row: SellOut) => <span style={{ fontWeight: 500 }}>{row.product?.name}</span>,
    },
    {
      key: 'sku',
      header: t('table.sku'),
      render: (row: SellOut) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
          {row.product?.sku}
        </span>
      ),
    },
    {
      key: 'classification',
      header: t('table.classification'),
      render: (row: SellOut) => {
        if (!row.product) return null;
        const label = classify(row);
        return <Badge variant={label === BOURCHANIN_CANONICAL_NAME ? 'success' : 'gray'}>{label}</Badge>;
      },
    },
    { key: 'store', header: t('table.store'), render: (row: SellOut) => <span style={{ color: 'var(--gray-600)' }}>{row.store?.name}</span> },
    { key: 'quantity', header: t('table.quantity'), render: (row: SellOut) => row.quantity },
    { key: 'price', header: t('table.price'), render: (row: SellOut) => Number(row.price).toFixed(2) },
    {
      key: 'created_at',
      header: t('table.date'),
      render: (row: SellOut) => <span style={{ color: 'var(--gray-500)' }}>{formatDateOnly(row.created_at, i18n.language)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="pos-header-actions">
            <Button variant="outline" icon={<DownloadIcon />} onClick={() => setExportOpen(true)}>
              {t('exportModal.button')}
            </Button>
            {p.can('sell_out.create') && (
              <>
                <Button variant="outline" icon={<UploadIcon />} onClick={() => setImportOpen(true)}>
                  {t('bulkImport.button')}
                </Button>
                <Button onClick={() => setCreateOpen(true)}>{t('addButton')}</Button>
              </>
            )}
          </div>
        }
      />

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 320 }}>
          <input
            className="form-input"
            placeholder={t('search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={classificationOptions}
          placeholder={t('filters.allClassifications')}
          value={classificationFilter}
          onChange={(e) => setClassificationFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={storeOptions}
          placeholder={t('filters.allStores')}
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t('filters.clear')}</Button>
        )}
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(row) => row.id} emptyMessage={t('table.empty')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('modalTitle')} size="md">
        <SellOutForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t('bulkImport.title')} size="md">
        <SellOutBulkImportModal onClose={() => setImportOpen(false)} />
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title={t('exportModal.title')} size="md">
        <SellOutExportModal items={items} onClose={() => setExportOpen(false)} />
      </Modal>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
