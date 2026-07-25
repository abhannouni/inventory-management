import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchStores, createStore, updateStore, deleteStore } from '../../store/slices/storesSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchProductStores, bulkAssignProductStores } from '../../store/slices/productStoresSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import TableToolbar from '../../components/ui/TableToolbar';
import DownloadDataButton from '../../components/charts/DownloadDataButton';
import StoreForm from './StoreForm';
import StoreBulkImportModal from './StoreBulkImportModal';
import { externalMapLink } from '../../utils/maps';
import type { ExportDataset } from '../../utils/export';
import type { Store } from '../../types';

export default function StoresPage() {
  const { t } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const p = usePermissions();
  const { items: stores, loading } = useAppSelector((s) => s.stores);
  const { items: regions } = useAppSelector((s) => s.regions);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: productStores } = useAppSelector((s) => s.productStores);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [productsFilter, setProductsFilter] = useState('');

  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchRegions());
    dispatch(fetchProducts());
    dispatch(fetchProductStores(undefined));
  }, [dispatch]);

  const assignedStoreIds = useMemo(
    () => new Set(productStores.map((ps) => ps.store_id)),
    [productStores],
  );

  const productAssignmentsByStore = useMemo(() => {
    const map = new Map<string, { product_id: string; expected_qty: number }[]>();
    for (const ps of productStores) {
      const list = map.get(ps.store_id) ?? [];
      list.push({ product_id: ps.product_id, expected_qty: ps.expected_qty });
      map.set(ps.store_id, list);
    }
    return map;
  }, [productStores]);

  const filteredStores = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores.filter((s) => {
      if (q) {
        const matches =
          s.name.toLowerCase().includes(q) ||
          (s.brand ?? '').toLowerCase().includes(q) ||
          (s.city ?? '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (productsFilter === 'yes' && !assignedStoreIds.has(s.id)) return false;
      if (productsFilter === 'no' && assignedStoreIds.has(s.id)) return false;
      return true;
    });
  }, [stores, search, productsFilter, assignedStoreIds]);

  const { pageItems, meta, setPage, setLimit } = useClientPagination(filteredStores);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createStore(data));
    if (createStore.fulfilled.match(res)) {
      const productAssignments = data.product_assignments as { product_id: string; expected_qty: number }[] | undefined;
      if (productAssignments?.length) {
        await dispatch(bulkAssignProductStores({ store_id: res.payload.id, items: productAssignments }));
      }
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.createError'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editStore) return;
    const res = await dispatch(updateStore({ id: editStore.id, payload: data }));
    if (updateStore.fulfilled.match(res)) {
      const productAssignments = data.product_assignments as { product_id: string; expected_qty: number }[] | undefined;
      const assignRes = await dispatch(
        bulkAssignProductStores({ store_id: editStore.id, items: productAssignments ?? [] }),
      );
      if (bulkAssignProductStores.rejected.match(assignRes)) {
        toast.error((assignRes.payload as string) || t('toasts.assignProductsError'));
      }
      toast.success(t('toasts.updateSuccess'));
      setEditStore(null);
    } else {
      toast.error(res.payload as string || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteStore(deleteId));
    setDeleting(false);
    if (deleteStore.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || t('toasts.deleteError'));
    }
  };

  const columns = [
    {
      key: 'name',
      header: t('columns.name'),
      render: (s: Store) => (
        <button type="button" className="pos-name-link" onClick={() => navigate(`/stores/${s.id}`)}>
          <span className="pos-name">{s.name}</span>
          {s.brand && <span className="pos-brand">{s.brand}</span>}
          {!assignedStoreIds.has(s.id) && (
            <Badge variant="gray" dot>{t('noProductsTag')}</Badge>
          )}
        </button>
      ),
    },
    {
      key: 'channel',
      header: t('columns.channel'),
      render: (s: Store) =>
        s.channel ? <Badge variant="primary">{t(`channel.${s.channel}`)}</Badge> : <span>—</span>,
    },
    {
      key: 'classification',
      header: t('columns.classification'),
      render: (s: Store) =>
        s.classification ? (
          <Badge variant="warning">{s.classification}</Badge>
        ) : (
          <span>—</span>
        ),
    },
    {
      key: 'city',
      header: t('columns.city'),
      hideOnMobile: true,
      render: (s: Store) => (
        <div>
          <div>{s.city || '—'}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{s.postal_code || ''}</div>
        </div>
      ),
    },
    {
      key: 'region',
      header: t('columns.region'),
      hideOnMobile: true,
      render: (s: Store) => <span>{s.region?.name || '—'}</span>,
    },
    {
      key: 'coords',
      header: t('columns.coordinates'),
      hideOnMobile: true,
      render: (s: Store) => {
        const link = externalMapLink(s);
        return link ? (
          <a
            className="gps-coords pos-map-link"
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            {Number(s.latitude).toFixed(4)}, {Number(s.longitude).toFixed(4)}
          </a>
        ) : (
          <span className="gps-coords">—</span>
        );
      },
    },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (s: Store) => (
        <div className="table-actions">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/stores/${s.id}`)}>
            {t('columns.view')}
          </Button>
          {p.can('pos.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditStore(s)}>{tCommon('actions.edit')}</Button>
          )}
          {p.can('pos.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(s.id)}>{tCommon('actions.delete')}</Button>
          )}
        </div>
      ),
    },
  ];

  /** The full POS profile, so an export carries the new fields — not just a name. */
  const dataset: ExportDataset<Store> = {
    name: t('title'),
    columns: [
      { header: t('columns.name'), value: (s) => s.name },
      { header: t('form.brandLabel'), value: (s) => s.brand ?? '' },
      { header: t('form.channelLabel'), value: (s) => (s.channel ? t(`channel.${s.channel}`) : '') },
      { header: t('form.classificationLabel'), value: (s) => s.classification ?? '' },
      { header: t('form.addressLabel'), value: (s) => s.address ?? '' },
      { header: t('form.cityLabel'), value: (s) => s.city ?? '' },
      { header: t('form.postalCodeLabel'), value: (s) => s.postal_code ?? '' },
      { header: t('form.regionLabel'), value: (s) => s.region?.name ?? '' },
      { header: t('form.openingDateLabel'), value: (s) => (s.opening_date ? String(s.opening_date).slice(0, 10) : '') },
      { header: t('form.contacts.sectionManager'), value: (s) => s.section_manager_name ?? '' },
      { header: `${t('form.contacts.sectionManager')} — ${t('form.contacts.phone')}`, value: (s) => s.section_manager_phone ?? '' },
      { header: t('form.contacts.departmentManager'), value: (s) => s.department_manager_name ?? '' },
      { header: `${t('form.contacts.departmentManager')} — ${t('form.contacts.phone')}`, value: (s) => s.department_manager_phone ?? '' },
      { header: t('form.contacts.gds'), value: (s) => s.gds_name ?? '' },
      { header: `${t('form.contacts.gds')} — ${t('form.contacts.phone')}`, value: (s) => s.gds_phone ?? '' },
      { header: t('form.latitudeLabel'), value: (s) => (s.latitude != null ? Number(s.latitude) : '') },
      { header: t('form.longitudeLabel'), value: (s) => (s.longitude != null ? Number(s.longitude) : '') },
      { header: t('form.mapsUrlLabel'), value: (s) => externalMapLink(s) ?? '' },
      { header: tCommon('status.active'), value: (s) => (s.is_active ? 'yes' : 'no') },
      { header: t('columns.created'), value: (s) => String(s.created_at).slice(0, 10) },
    ],
    rows: stores,
  };

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <div className="pos-header-actions">
            <DownloadDataButton size="md" datasets={[dataset]} fileName={t('title')} />
            {p.can('pos.create') && (
              <>
                <Button variant="outline" icon={<UploadIcon />} onClick={() => setImportOpen(true)}>{t('bulkImport.button')}</Button>
                <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addStore')}</Button>
              </>
            )}
          </div>
        }
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={tCommon('search.placeholder')}
          filters={[
            {
              key: 'productsAssigned',
              label: t('filters.productsAssigned'),
              value: productsFilter,
              options: [
                { value: 'yes', label: t('filters.yes') },
                { value: 'no', label: t('filters.no') },
              ],
            },
          ]}
          onFilterChange={(key, value) => { if (key === 'productsAssigned') setProductsFilter(value); }}
          onReset={() => { setSearch(''); setProductsFilter(''); }}
        />
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(s) => s.id} emptyMessage={t('emptyTable')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      {/* The profile form is four sections long — it needs the wide modal. */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createStore')} size="lg">
        <StoreForm regions={regions} products={products} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editStore} onClose={() => setEditStore(null)} title={t('editStore')} size="lg">
        {editStore && (
          <StoreForm
            regions={regions}
            products={products}
            initialData={editStore}
            initialProductAssignments={productAssignmentsByStore.get(editStore.id) ?? []}
            onSubmit={handleUpdate}
            onCancel={() => setEditStore(null)}
          />
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t('bulkImport.title')} size="md">
        <StoreBulkImportModal onClose={() => setImportOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message={t('deleteConfirm.message')}
      />
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

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
