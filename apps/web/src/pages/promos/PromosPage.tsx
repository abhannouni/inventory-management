import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { fetchProducts } from '../../store/slices/productsSlice';
import {
  fetchCurrentPromo,
  fetchPromoBatch,
  fetchPromoBatches,
  removePromoItem,
  removePromoBatch,
  clearViewed,
} from '../../store/slices/promosSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import AddPromoModal from './AddPromoModal';
import ImportPromoModal from './ImportPromoModal';
import EditPromoItemModal from './EditPromoItemModal';
import PromoPictureCell from './PromoPictureCell';
import PicturesTab from './PicturesTab';
import { formatDateOnly } from '../../utils/format';
import type { PromoItem } from '../../types';

type Tab = 'table' | 'pictures';

export default function PromosPage() {
  const { t, i18n } = useTranslation('promos');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();

  const { viewed, current, batches, loading, batchesLoading } = useAppSelector((s) => s.promos);

  const [tab, setTab] = useState<Tab>('table');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editItem, setEditItem] = useState<PromoItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deletingItem, setDeletingItem] = useState(false);
  const [deleteBatchOpen, setDeleteBatchOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState(false);

  useEffect(() => {
    dispatch(fetchCurrentPromo());
    if (p.canManagePromos) dispatch(fetchPromoBatches());
    if (p.canUploadPromoPicture || p.canManagePromos) dispatch(fetchProducts());
  }, [dispatch, p.canManagePromos, p.canUploadPromoPicture]);

  const handleBatchChange = (id: string) => {
    setSelectedBatchId(id);
    if (!id) dispatch(clearViewed());
    else dispatch(fetchPromoBatch(id));
  };

  const batchOptions = useMemo(
    () =>
      batches.map((b) => ({
        value: b.id,
        label: `${b.title || t('filters.untitledBatch')} — ${formatDateOnly(b.created_at, i18n.language)} (${b._count?.items ?? 0})`,
      })),
    [batches, i18n.language, t],
  );

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    setDeletingItem(true);
    const res = await dispatch(removePromoItem(deleteItemId));
    setDeletingItem(false);
    if (removePromoItem.fulfilled.match(res)) {
      toast.success(t('toasts.removeItemSuccess'));
      setDeleteItemId(null);
    } else {
      toast.error((res.payload as string) || t('toasts.removeItemError'));
    }
  };

  const handleDeleteBatch = async () => {
    if (!viewed) return;
    setDeletingBatch(true);
    const res = await dispatch(removePromoBatch(viewed.id));
    setDeletingBatch(false);
    if (removePromoBatch.fulfilled.match(res)) {
      toast.success(t('toasts.removeBatchSuccess'));
      setDeleteBatchOpen(false);
      setSelectedBatchId('');
    } else {
      toast.error((res.payload as string) || t('toasts.removeBatchError'));
    }
  };

  const showPictureColumn = p.canUploadPromoPicture;
  const showActionsColumn = p.canManagePromos;

  const columns = [
    {
      key: 'product',
      header: t('table.product'),
      render: (item: PromoItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{item.product?.name || '—'}</div>
          {item.product?.sku && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{item.product.sku}</div>}
        </div>
      ),
    },
    { key: 'contenance', header: t('table.contenance'), render: (item: PromoItem) => item.contenance },
    { key: 'original_price', header: t('table.originalPrice'), render: (item: PromoItem) => Number(item.original_price).toFixed(2) },
    { key: 'promo_price', header: t('table.promoPrice'), render: (item: PromoItem) => <strong>{Number(item.promo_price).toFixed(2)}</strong> },
    ...(showPictureColumn
      ? [{ key: 'picture', header: t('table.picture'), render: (item: PromoItem) => <PromoPictureCell item={item} /> }]
      : []),
    ...(showActionsColumn
      ? [
          {
            key: 'actions',
            header: '',
            render: (item: PromoItem) => (
              <div className="table-actions">
                <Button variant="outline" size="sm" onClick={() => setEditItem(item)}>{tCommon('actions.edit')}</Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteItemId(item.id)}>{tCommon('actions.remove')}</Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.canManagePromos && tab === 'table' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" onClick={() => setImportOpen(true)}>{t('actions.importExcel')}</Button>
              <Button icon={<PlusIcon />} onClick={() => setAddOpen(true)}>{t('actions.addPromo')}</Button>
            </div>
          ) : undefined
        }
      />

      {p.canManagePromos && (
        <div className="tabs">
          <button className={`tab-item ${tab === 'table' ? 'active' : ''}`} onClick={() => setTab('table')}>
            {t('tabs.table')}
          </button>
          <button className={`tab-item ${tab === 'pictures' ? 'active' : ''}`} onClick={() => setTab('pictures')}>
            {t('tabs.pictures')}
          </button>
        </div>
      )}

      {p.canManagePromos && (
        <div className="filter-bar" style={{ alignItems: 'flex-end', gap: 12 }}>
          <Select
            options={batchOptions}
            placeholder={t('filters.viewingCurrent')}
            value={selectedBatchId}
            onChange={(e) => handleBatchChange(e.target.value)}
            style={{ minWidth: 280 }}
          />
          {selectedBatchId ? (
            <Badge variant="warning">{t('filters.viewingBatch')}</Badge>
          ) : (
            <Badge variant="success">{t('filters.viewingCurrent')}</Badge>
          )}
          {viewed && (
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
              {t('filters.itemCount', { count: viewed.items.length })}
            </span>
          )}
          {tab === 'table' && p.canManagePromos && viewed && (
            <Button variant="danger" size="sm" onClick={() => setDeleteBatchOpen(true)} style={{ marginInlineStart: 'auto' }}>
              {t('actions.deletePromo')}
            </Button>
          )}
        </div>
      )}

      {tab === 'pictures' && p.canManagePromos ? (
        <PicturesTab promoId={selectedBatchId || undefined} />
      ) : (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <DataTable
            columns={columns}
            data={viewed?.items ?? []}
            loading={loading || (p.canManagePromos && batchesLoading && !current)}
            keyExtractor={(item) => item.id}
            emptyMessage={t('table.empty')}
          />
        </motion.div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={t('modal.addTitle')} size="lg">
        {addOpen && <AddPromoModal onClose={() => setAddOpen(false)} />}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t('modal.importTitle')} size="md">
        {importOpen && <ImportPromoModal onClose={() => setImportOpen(false)} />}
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={t('modal.editItemTitle')} size="sm">
        {editItem && <EditPromoItemModal item={editItem} onClose={() => setEditItem(null)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleteItemId}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDeleteItem}
        loading={deletingItem}
        confirmLabel={tCommon('actions.remove')}
        message={t('deleteItemConfirm.message')}
      />

      <ConfirmDialog
        open={deleteBatchOpen}
        onClose={() => setDeleteBatchOpen(false)}
        onConfirm={handleDeleteBatch}
        loading={deletingBatch}
        confirmLabel={tCommon('actions.remove')}
        message={t('deleteBatchConfirm.message')}
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
