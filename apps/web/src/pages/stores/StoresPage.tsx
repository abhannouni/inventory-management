import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
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
      toast.success('Store created');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to create store');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editStore) return;
    const res = await dispatch(updateStore({ id: editStore.id, payload: data }));
    if (updateStore.fulfilled.match(res)) {
      toast.success('Store updated');
      setEditStore(null);
    } else {
      toast.error(res.payload as string || 'Failed to update store');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteStore(deleteId));
    setDeleting(false);
    if (deleteStore.fulfilled.match(res)) {
      toast.success('Store deleted');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to delete store');
    }
  };

  const columns = [
    { key: 'name', header: 'Store Name', render: (s: Store) => <span style={{ fontWeight: 500 }}>{s.name}</span> },
    { key: 'address', header: 'Address', render: (s: Store) => <span style={{ color: 'var(--gray-500)' }}>{s.address}</span> },
    { key: 'region', header: 'Region', render: (s: Store) => <span>{s.region?.name || '—'}</span> },
    {
      key: 'coords',
      header: 'Coordinates',
      render: (s: Store) => (
        <span className="gps-coords">
          {s.latitude != null && s.longitude != null ? `${Number(s.latitude).toFixed(4)}, ${Number(s.longitude).toFixed(4)}` : '—'}
        </span>
      ),
    },
    { key: 'created_at', header: 'Created', render: (s: Store) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(s.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (s: Store) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditStore(s)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(s.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Stores"
        subtitle="Manage store locations and coordinates"
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>Add Store</Button>}
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={stores} loading={loading} keyExtractor={(s) => s.id} emptyMessage="No stores found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Store" size="md">
        <StoreForm regions={regions} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editStore} onClose={() => setEditStore(null)} title="Edit Store" size="md">
        {editStore && (
          <StoreForm regions={regions} initialData={editStore} onSubmit={handleUpdate} onCancel={() => setEditStore(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="This will permanently delete the store and all associated data."
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
