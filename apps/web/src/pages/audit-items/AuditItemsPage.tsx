import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchAuditItems, createAuditItem, bulkUpsertAuditItems, updateAuditItem, deleteAuditItem } from '../../store/slices/auditItemsSlice';
import { fetchVisits } from '../../store/slices/visitsSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';
import AuditItemForm from './AuditItemForm';
import BulkAuditForm from './BulkAuditForm';
import Select from '../../components/ui/Select';
import type { AuditItem, AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger' | 'primary'> = {
  in_stock: 'primary',
  stock_disponible: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function AuditItemsPage() {
  const { t, i18n } = useTranslation('auditItems');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items, loading } = useAppSelector((s) => s.auditItems);
  const { items: visits } = useAppSelector((s) => s.visits);
  const { items: products } = useAppSelector((s) => s.products);
  const { items: stores } = useAppSelector((s) => s.stores);

  const [createOpen, setCreateOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editItem, setEditItem] = useState<AuditItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterStore, setFilterStore] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterVisit, setFilterVisit] = useState('');
  const didAutoSelectVisit = useRef(false);

  useEffect(() => {
    dispatch(fetchVisits(undefined));
    dispatch(fetchProducts());
    dispatch(fetchStores());
  }, [dispatch]);

  // Visits sorted most-recent-first by the API; narrow them by the store/date filters.
  const filteredVisits = useMemo(() => {
    return visits.filter((v) => {
      if (filterStore && v.store_id !== filterStore) return false;
      const checkinDate = v.checkin_at.slice(0, 10);
      if (filterFrom && checkinDate < filterFrom) return false;
      if (filterTo && checkinDate > filterTo) return false;
      return true;
    });
  }, [visits, filterStore, filterFrom, filterTo]);

  // Default to the most recent visit instead of a blank "all visits" view — the
  // list API requires a single visit_id, and merchandisers almost always want
  // to pick up where the last visit left off.
  useEffect(() => {
    if (!didAutoSelectVisit.current && visits.length > 0) {
      didAutoSelectVisit.current = true;
      setFilterVisit(filteredVisits[0]?.id || '');
    }
  }, [visits, filteredVisits]);

  // If store/date filters narrow out the currently selected visit, fall back to
  // the latest visit still matching instead of silently showing stale data.
  useEffect(() => {
    if (filterVisit && !filteredVisits.some((v) => v.id === filterVisit)) {
      setFilterVisit(filteredVisits[0]?.id || '');
    }
  }, [filteredVisits, filterVisit]);

  useEffect(() => {
    if (filterVisit) dispatch(fetchAuditItems({ visit_id: filterVisit }));
  }, [filterVisit, dispatch]);

  const hasFilters = !!(filterStore || filterFrom || filterTo);
  const resetFilters = () => { setFilterStore(''); setFilterFrom(''); setFilterTo(''); };

  const displayedItems = filterVisit ? items : [];
  const { pageItems, meta, setPage, setLimit } = useClientPagination(displayedItems);

  const handleCreate = async (data: any) => {
    // The form flags a duplicate (same product already audited on this visit)
    // by attaching the existing item's id — route that through an update
    // instead of hitting the backend's unique-constraint error.
    const { id: duplicateId, ...payload } = data;
    if (duplicateId) {
      const res = await dispatch(updateAuditItem({ id: duplicateId, payload }));
      if (updateAuditItem.fulfilled.match(res)) {
        toast.success(t('toasts.updateSuccess'));
        setCreateOpen(false);
      } else {
        toast.error(res.payload as string || t('toasts.updateError'));
      }
      return;
    }
    const res = await dispatch(createAuditItem(payload));
    if (createAuditItem.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.createError'));
    }
  };

  const handleBulk = async (data: any) => {
    const res = await dispatch(bulkUpsertAuditItems(data));
    if (bulkUpsertAuditItems.fulfilled.match(res)) {
      toast.success(t('toasts.bulkSuccess', { count: res.payload.length }));
      setBulkOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.bulkError'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editItem) return;
    const res = await dispatch(updateAuditItem({ id: editItem.id, payload: data }));
    if (updateAuditItem.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditItem(null);
    } else {
      toast.error(res.payload as string || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteAuditItem(deleteId));
    setDeleting(false);
    if (deleteAuditItem.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || t('toasts.deleteError'));
    }
  };

  const statusLabel: Record<AuditStatus, string> = {
    in_stock: tCommon('status.in_stock'),
    stock_disponible: tCommon('status.stock_disponible'),
    low_stock: tCommon('status.low_stock'),
    out_of_stock: tCommon('status.out_of_stock'),
  };

  const columns = [
    { key: 'product', header: t('table.product'), render: (ai: AuditItem) => <span style={{ fontWeight: 500 }}>{ai.product?.name || ai.product_id}</span> },
    { key: 'qty_found', header: t('table.qtyFound'), render: (ai: AuditItem) => <span style={{ fontWeight: 600 }}>{ai.qty_found}</span> },
    { key: 'status', header: t('table.status'), render: (ai: AuditItem) => <Badge variant={statusBadge[ai.status]}>{statusLabel[ai.status]}</Badge> },
    { key: 'notes', header: t('table.notes'), render: (ai: AuditItem) => <span style={{ color: 'var(--gray-500)', maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ai.notes || '—'}</span> },
    {
      key: 'photo',
      header: t('table.photo'),
      render: (ai: AuditItem) =>
        ai.photo_url ? (
          <a href={ai.photo_url} target="_blank" rel="noopener noreferrer">
            <img src={ai.photo_url} alt="audit" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
          </a>
        ) : <span style={{ color: 'var(--gray-400)' }}>—</span>,
    },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (ai: AuditItem) => (
        <div className="table-actions">
          {p.can('audit_items.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditItem(ai)}>{tCommon('actions.edit')}</Button>
          )}
          {p.can('audit_items.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(ai.id)}>{tCommon('actions.delete')}</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('pageTitle')}
        subtitle={t('pageSubtitle')}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {p.can('audit_items.create') && (
              <>
                <Button variant="secondary" onClick={() => setBulkOpen(true)}>{t('bulkAudit')}</Button>
                <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addAuditItem')}</Button>
              </>
            )}
          </div>
        }
      />

      <div className="filter-bar">
        <Select
          label={t('filters.store')}
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          placeholder={t('filters.allStores')}
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
        />
        <label className="form-group" style={{ minWidth: 150 }}>
          <span className="form-label">{t('filters.from')}</span>
          <input
            type="date"
            className="form-input"
            value={filterFrom}
            max={filterTo || undefined}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </label>
        <label className="form-group" style={{ minWidth: 150 }}>
          <span className="form-label">{t('filters.to')}</span>
          <input
            type="date"
            className="form-input"
            value={filterTo}
            min={filterFrom || undefined}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </label>
        <Select
          label={t('filters.visit')}
          options={filteredVisits.map((v) => ({ value: v.id, label: `${v.store?.name || v.store_id} — ${new Date(v.checkin_at).toLocaleDateString(i18n.language)}` }))}
          placeholder={t('allVisits')}
          value={filterVisit}
          onChange={(e) => setFilterVisit(e.target.value)}
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>{tCommon('filters.reset')}</Button>
        )}
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable
          columns={columns}
          data={pageItems}
          loading={loading}
          keyExtractor={(ai) => ai.id}
          emptyMessage={filterVisit ? t('table.empty') : t('table.noVisitSelected')}
        />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('modals.createTitle')} size="md">
        <AuditItemForm visits={visits} products={products} defaultVisitId={filterVisit} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={t('modals.editTitle')} size="md">
        {editItem && <AuditItemForm visits={visits} products={products} initialData={editItem} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} />}
      </Modal>

      <Modal open={bulkOpen} onClose={() => setBulkOpen(false)} title={t('modals.bulkTitle')} size="lg">
        <BulkAuditForm visits={visits} products={products} onSubmit={handleBulk} onCancel={() => setBulkOpen(false)} />
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
