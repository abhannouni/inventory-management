import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores, createStore, updateStore, deleteStore } from '../../store/slices/storesSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StoreForm from './StoreForm';
import { formatDate } from '../../utils/format';
import type { Store } from '../../types';

export default function StoresPage() {
  const { t, i18n } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { items: stores, loading } = useAppSelector((s) => s.stores);
  const { items: regions } = useAppSelector((s) => s.regions);

  const [createOpen, setCreateOpen] = useState(false);
  const [editStore, setEditStore] = useState<Store | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchRegions());
  }, [dispatch]);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createStore(data));
    if (createStore.fulfilled.match(res)) {
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
    { key: 'name', header: t('columns.name'), render: (s: Store) => <span style={{ fontWeight: 500 }}>{s.name}</span> },
    { key: 'address', header: t('columns.address'), render: (s: Store) => <span style={{ color: 'var(--gray-500)' }}>{s.address}</span> },
    { key: 'region', header: t('columns.region'), render: (s: Store) => <span>{s.region?.name || '—'}</span> },
    {
      key: 'coords',
      header: t('columns.coordinates'),
      render: (s: Store) => (
        <span className="gps-coords">
          {s.latitude != null && s.longitude != null ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : '—'}
        </span>
      ),
    },
    { key: 'created_at', header: t('columns.created'), render: (s: Store) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(s.created_at, i18n.language)}</span> },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (s: Store) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditStore(s)}>{tCommon('actions.edit')}</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(s.id)}>{tCommon('actions.delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addStore')}</Button>}
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={stores} loading={loading} keyExtractor={(s) => s.id} emptyMessage={t('emptyTable')} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createStore')} size="md">
        <StoreForm regions={regions} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editStore} onClose={() => setEditStore(null)} title={t('editStore')} size="md">
        {editStore && (
          <StoreForm regions={regions} initialData={editStore} onSubmit={handleUpdate} onCancel={() => setEditStore(null)} />
        )}
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
