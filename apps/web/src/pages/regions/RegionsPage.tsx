import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchRegions, createRegion, updateRegion, deleteRegion } from '../../store/slices/regionsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import Input from '../../components/ui/Input';
import { formatDate } from '../../utils/format';
import type { Region } from '../../types';

export default function RegionsPage() {
  const { t, i18n } = useTranslation('regions');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items: regions, loading } = useAppSelector((s) => s.regions);

  const [createOpen, setCreateOpen] = useState(false);
  const [editRegion, setEditRegion] = useState<Region | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchRegions()); }, [dispatch]);

  const { pageItems, meta, setPage, setLimit } = useClientPagination(regions);

  const openCreate = () => { setName(''); setNameError(''); setCreateOpen(true); };
  const openEdit = (r: Region) => { setName(r.name); setNameError(''); setEditRegion(r); };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setNameError(t('errors.nameRequired')); return; }
    setSaving(true);
    const res = await dispatch(createRegion({ name: name.trim() }));
    setSaving(false);
    if (createRegion.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.createError'));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRegion || !name.trim()) { setNameError(t('errors.nameRequired')); return; }
    setSaving(true);
    const res = await dispatch(updateRegion({ id: editRegion.id, payload: { name: name.trim() } }));
    setSaving(false);
    if (updateRegion.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditRegion(null);
    } else {
      toast.error(res.payload as string || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteRegion(deleteId));
    setDeleting(false);
    if (deleteRegion.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || t('toasts.deleteError'));
    }
  };

  const columns = [
    { key: 'name', header: t('columns.name'), render: (r: Region) => <span style={{ fontWeight: 500 }}>{r.name}</span> },
    { key: 'id', header: t('columns.id'), render: (r: Region) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-400)' }}>{r.id.slice(0, 8)}…</span> },
    { key: 'created_at', header: t('columns.created'), render: (r: Region) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(r.created_at, i18n.language)}</span> },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (r: Region) => (
        <div className="table-actions">
          {p.can('regions.update') && (
            <Button variant="outline" size="sm" onClick={() => openEdit(r)}>{tCommon('actions.edit')}</Button>
          )}
          {p.can('regions.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>{tCommon('actions.delete')}</Button>
          )}
        </div>
      ),
    },
  ];

  const RegionForm = (onSubmit: (e: React.FormEvent) => void) => (
    <form onSubmit={onSubmit}>
      <Input
        label={t('form.nameLabel')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={nameError}
        placeholder={t('form.namePlaceholder')}
        autoFocus
      />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={() => { setCreateOpen(false); setEditRegion(null); }} disabled={saving}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={saving}>{tCommon('actions.save')}</Button>
      </div>
    </form>
  );

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.can('regions.create') ? (
            <Button icon={<PlusIcon />} onClick={openCreate}>{t('addRegion')}</Button>
          ) : undefined
        }
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(r) => r.id} emptyMessage={t('emptyTable')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createRegion')} size="sm">
        {RegionForm(handleCreate)}
      </Modal>

      <Modal open={!!editRegion} onClose={() => setEditRegion(null)} title={t('editRegion')} size="sm">
        {RegionForm(handleUpdate)}
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
