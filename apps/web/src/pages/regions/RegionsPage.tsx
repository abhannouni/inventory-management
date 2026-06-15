import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchRegions, createRegion, updateRegion, deleteRegion } from '../../store/slices/regionsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Input from '../../components/ui/Input';
import { formatDate } from '../../utils/format';
import type { Region } from '../../types';

export default function RegionsPage() {
  const dispatch = useAppDispatch();
  const { items: regions, loading } = useAppSelector((s) => s.regions);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRegion, setEditRegion] = useState<Region | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchRegions()); }, [dispatch]);

  const openCreate = () => { setName(''); setNameError(''); setCreateOpen(true); };
  const openEdit = (r: Region) => { setName(r.name); setNameError(''); setEditRegion(r); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError('Name is required'); return; }
    setSaving(true);
    const res = await dispatch(createRegion({ name: name.trim() }));
    setSaving(false);
    if (createRegion.fulfilled.match(res)) {
      toast.success('Region created');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to create region');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRegion || !name.trim()) { setNameError('Name is required'); return; }
    setSaving(true);
    const res = await dispatch(updateRegion({ id: editRegion.id, payload: { name: name.trim() } }));
    setSaving(false);
    if (updateRegion.fulfilled.match(res)) {
      toast.success('Region updated');
      setEditRegion(null);
    } else {
      toast.error(res.payload as string || 'Failed to update region');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteRegion(deleteId));
    setDeleting(false);
    if (deleteRegion.fulfilled.match(res)) {
      toast.success('Region deleted');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to delete region');
    }
  };

  const columns = [
    { key: 'name', header: 'Name', render: (r: Region) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
    { key: 'id', header: 'ID', render: (r: Region) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-400)' }}>{r.id.slice(0, 8)}…</span> },
    { key: 'created_at', header: 'Created', render: (r: Region) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(r.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r: Region) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => openEdit(r)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  const RegionForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit}>
      <Input
        label="Region Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        placeholder="e.g. North Region"
        autoFocus
      />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={() => { setCreateOpen(false); setEditRegion(null); }} disabled={saving}>Cancel</Button>
        <Button type="submit" loading={saving}>Save</Button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title="Regions"
        subtitle="Manage geographic regions"
        actions={<Button icon={<PlusIcon />} onClick={openCreate}>Add Region</Button>}
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={regions} loading={loading} keyExtractor={(r) => r.id} emptyMessage="No regions found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Region" size="sm">
        {RegionForm(handleCreate)}
      </Modal>

      <Modal open={!!editRegion} onClose={() => setEditRegion(null)} title="Edit Region" size="sm">
        {RegionForm(handleUpdate)}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="Deleting this region will affect all users and stores associated with it."
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
