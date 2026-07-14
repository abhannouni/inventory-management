import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores, createStore, updateStore, deleteStore } from '../../store/slices/storesSlice';
import { fetchRegions } from '../../store/slices/regionsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DownloadDataButton from '../../components/charts/DownloadDataButton';
import StoreForm from './StoreForm';
import { googleMapsLink } from '../../utils/maps';
import type { ExportDataset } from '../../utils/export';
import type { Store } from '../../types';

export default function StoresPage() {
  const { t } = useTranslation('stores');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
    {
      key: 'name',
      header: t('columns.name'),
      render: (s: Store) => (
        <button type="button" className="pos-name-link" onClick={() => navigate(`/stores/${s.id}`)}>
          <span className="pos-name">{s.name}</span>
          {s.brand && <span className="pos-brand">{s.brand}</span>}
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
        const link = googleMapsLink(s);
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
          <Button variant="outline" size="sm" onClick={() => setEditStore(s)}>{tCommon('actions.edit')}</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(s.id)}>{tCommon('actions.delete')}</Button>
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
      { header: t('form.mapsUrlLabel'), value: (s) => googleMapsLink(s) ?? '' },
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
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addStore')}</Button>
          </div>
        }
      />

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={stores} loading={loading} keyExtractor={(s) => s.id} emptyMessage={t('emptyTable')} />
      </motion.div>

      {/* The profile form is three sections long — it needs the wide modal. */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createStore')} size="lg">
        <StoreForm regions={regions} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editStore} onClose={() => setEditStore(null)} title={t('editStore')} size="lg">
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
