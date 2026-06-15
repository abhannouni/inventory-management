import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchAuditItems, createAuditItem, bulkUpsertAuditItems, updateAuditItem, deleteAuditItem } from '../../store/slices/auditItemsSlice';
import { fetchVisits } from '../../store/slices/visitsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Badge from '../../components/ui/Badge';
import AuditItemForm from './AuditItemForm';
import BulkAuditForm from './BulkAuditForm';
import Select from '../../components/ui/Select';
import type { AuditItem, AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

const statusLabel: Record<AuditStatus, string> = {
  in_stock: 'In Stock',
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
};

export default function AuditItemsPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.auditItems);
  const { items: visits } = useAppSelector((s) => s.visits);
  const { items: products } = useAppSelector((s) => s.products);

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editItem, setEditItem] = useState<AuditItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterVisit, setFilterVisit] = useState('');

  useEffect(() => {
    dispatch(fetchAuditItems(undefined));
    dispatch(fetchVisits(undefined));
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchAuditItems(filterVisit ? { visit_id: filterVisit } : undefined));
  }, [filterVisit, dispatch]);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createAuditItem(data));
    if (createAuditItem.fulfilled.match(res)) {
      toast.success('Audit item created');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to create audit item');
    }
  };

  const handleBulk = async (data: any) => {
    const res = await dispatch(bulkUpsertAuditItems(data));
    if (bulkUpsertAuditItems.fulfilled.match(res)) {
      toast.success(`Bulk audit saved — ${res.payload.length} items`);
      setBulkOpen(false);
    } else {
      toast.error(res.payload as string || 'Bulk audit failed');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editItem) return;
    const res = await dispatch(updateAuditItem({ id: editItem.id, payload: data }));
    if (updateAuditItem.fulfilled.match(res)) {
      toast.success('Audit item updated');
      setEditItem(null);
    } else {
      toast.error(res.payload as string || 'Failed to update audit item');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteAuditItem(deleteId));
    setDeleting(false);
    if (deleteAuditItem.fulfilled.match(res)) {
      toast.success('Audit item deleted');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to delete audit item');
    }
  };

  const columns = [
    { key: 'product', header: 'Product', render: (ai: AuditItem) => <span style={{ fontWeight: 500 }}>{ai.product?.name || ai.product_id}</span> },
    { key: 'qty_found', header: 'Qty Found', render: (ai: AuditItem) => <span style={{ fontWeight: 600 }}>{ai.qty_found}</span> },
    { key: 'status', header: 'Status', render: (ai: AuditItem) => <Badge variant={statusBadge[ai.status]}>{statusLabel[ai.status]}</Badge> },
    { key: 'notes', header: 'Notes', render: (ai: AuditItem) => <span style={{ color: 'var(--gray-500)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ai.notes || '—'}</span> },
    {
      key: 'photo',
      header: 'Photo',
      render: (ai: AuditItem) =>
        ai.photo_url ? (
          <a href={ai.photo_url} target="_blank" rel="noopener noreferrer">
            <img src={ai.photo_url} alt="audit" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
          </a>
        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (ai: AuditItem) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditItem(ai)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(ai.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Audit Items"
        subtitle="Record and manage product audits during store visits"
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setBulkOpen(true)}>Bulk Audit</Button>
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>Add Audit Item</Button>
          </div>
        }
      />

      <div className="filter-bar">
        <Select
          options={visits.map((v) => ({ value: v.id, label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString()}` }))}
          placeholder="All visits"
          value={filterVisit}
          onChange={(e) => setFilterVisit(e.target.value)}
          label=""
        />
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={items} loading={loading} keyExtractor={(ai) => ai.id} emptyMessage="No audit items found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Audit Item" size="md">
        <AuditItemForm visits={visits} products={products} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Audit Item" size="md">
        {editItem && <AuditItemForm visits={visits} products={products} initialData={editItem} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} />}
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title="Bulk Audit" size="lg">
        <BulkAuditForm visits={visits} products={products} onSubmit={handleBulk} onCancel={() => setBulkOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="This will permanently delete the audit item."
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
