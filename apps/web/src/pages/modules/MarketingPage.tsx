import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchProductRequests, createProductRequest } from '../../store/slices/productRequestsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import ProductRequestForm from './ProductRequestForm';
import { formatDate } from '../../utils/format';
import type { CreateProductRequestPayload } from '../../api/product-requests.api';
import type { ProductRequest, Store } from '../../types';

export default function MarketingPage() {
  const { t, i18n } = useTranslation('productRequests');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items, loading } = useAppSelector((s) => s.productRequests);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [createOpen, setCreateOpen] = useState(false);
  const [filterStore, setFilterStore] = useState('');

  useEffect(() => { dispatch(fetchStores()); }, [dispatch]);

  useEffect(() => {
    dispatch(fetchProductRequests(filterStore ? { store_id: filterStore } : undefined));
  }, [filterStore, dispatch]);

  const { pageItems, meta, setPage, setLimit } = useClientPagination(items);

  const handleCreate = async (data: CreateProductRequestPayload) => {
    const res = await dispatch(createProductRequest(data));
    if (createProductRequest.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error((res.payload as string) || t('toasts.createError'));
    }
  };

  const columns = [
    {
      key: 'photo',
      header: t('table.photo'),
      render: (pr: ProductRequest) => (
        <img src={pr.image_url} alt={pr.sous_famille} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />
      ),
    },
    { key: 'store', header: t('table.store'), render: (pr: ProductRequest) => <span style={{ fontWeight: 500 }}>{pr.store?.name || pr.store_id}</span> },
    { key: 'sousFamille', header: t('table.sousFamille'), render: (pr: ProductRequest) => <span>{pr.sous_famille}</span> },
    { key: 'dimensions', header: t('table.dimensions'), render: (pr: ProductRequest) => <span>{pr.width} × {pr.height} × {pr.depth} cm</span> },
    { key: 'requestedBy', header: t('table.requestedBy'), render: (pr: ProductRequest) => <span>{pr.created_by?.full_name || '—'}</span> },
    { key: 'date', header: t('table.date'), render: (pr: ProductRequest) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(pr.created_at, i18n.language)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.can('product_requests.create') ? (
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('newRequest')}</Button>
          ) : undefined
        }
      />

      <div className="filter-bar">
        <Select
          options={stores.map((s: Store) => ({ value: s.id, label: s.name }))}
          placeholder={t('allStores')}
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          style={{ minWidth: 200 }}
        />
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(pr) => pr.id} emptyMessage={t('table.empty')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('modal.newTitle')} size="md">
        <ProductRequestForm stores={stores} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
