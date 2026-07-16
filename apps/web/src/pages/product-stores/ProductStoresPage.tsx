import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation, Trans } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchProductStores, createProductStore, updateProductStore, deleteProductStore } from '../../store/slices/productStoresSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import type { ProductStore, Store, Product } from '../../types';

export default function ProductStoresPage() {
  const { t } = useTranslation('productStores');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items, loading } = useAppSelector((s) => s.productStores);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductStore | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterStore, setFilterStore] = useState('');
  const [search, setSearch] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    dispatch(fetchStores());
    dispatch(fetchProducts());
  }, [dispatch]);

  useEffect(() => {
    if (filterStore) {
      dispatch(fetchProductStores({ store_id: filterStore }));
    } else {
      dispatch(fetchProductStores(undefined));
    }
  }, [filterStore, dispatch]);

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    [products]
  );

  const hasActiveFilters = !!search || !!filterProduct || !!filterCategory;

  const clearFilters = () => {
    setSearch('');
    setFilterProduct('');
    setFilterCategory('');
  };

  const filtered = items.filter((ps) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      ps.store?.name?.toLowerCase().includes(q) ||
      ps.product?.name?.toLowerCase().includes(q) ||
      ps.product?.sku?.toLowerCase().includes(q) ||
      ps.product?.category?.toLowerCase().includes(q);
    return matchesSearch && (!filterProduct || ps.product_id === filterProduct) && (!filterCategory || ps.product?.category === filterCategory);
  });

  const { pageItems, meta, setPage, setLimit } = useClientPagination(filtered);

  const handleCreate = async (data: any) => {
    const res = await dispatch(createProductStore(data));
    if (createProductStore.fulfilled.match(res)) {
      toast.success(t('toasts.assignSuccess'));
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.assignError'));
    }
  };

  const handleUpdate = async (expected_qty: number) => {
    if (!editItem) return;
    const res = await dispatch(updateProductStore({ id: editItem.id, payload: { expected_qty } }));
    if (updateProductStore.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditItem(null);
    } else {
      toast.error(res.payload as string || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteProductStore(deleteId));
    setDeleting(false);
    if (deleteProductStore.fulfilled.match(res)) {
      toast.success(t('toasts.removeSuccess'));
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || t('toasts.removeError'));
    }
  };

  const columns = [
    { key: 'store', header: t('table.store'), render: (ps: ProductStore) => <span style={{ fontWeight: 500 }}>{ps.store?.name || ps.store_id}</span> },
    { key: 'product', header: t('table.product'), render: (ps: ProductStore) => <span>{ps.product?.name || ps.product_id}</span> },
    { key: 'sku', header: t('table.sku'), render: (ps: ProductStore) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ps.product?.sku || '—'}</span> },
    { key: 'category', header: t('table.category'), render: (ps: ProductStore) => <span style={{ color: 'var(--gray-500)' }}>{ps.product?.category || '—'}</span> },
    { key: 'expected_qty', header: t('table.expectedQty'), render: (ps: ProductStore) => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{ps.expected_qty}</span> },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (ps: ProductStore) => (
        <div className="table-actions">
          {p.can('inventory.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditItem(ps)}>{t('actions.editQty')}</Button>
          )}
          {p.can('inventory.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(ps.id)}>{tCommon('actions.remove')}</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          p.can('inventory.create') ? (
            <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('assignProduct')}</Button>
          ) : undefined
        }
      />

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 320 }}>
          <input
            className="form-input"
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          placeholder={t('allStores')}
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
          placeholder={t('allProducts')}
          value={filterProduct}
          onChange={(e) => setFilterProduct(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={categoryOptions}
          placeholder={t('allCategories')}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ minWidth: 160 }}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t('clearFilters')}</Button>
        )}
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(ps) => ps.id} emptyMessage={t('table.empty')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('assignProductToStore')} size="sm">
        <AssignForm stores={stores} products={products} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={t('updateExpectedQty')} size="sm">
        {editItem && (
          <EditQtyForm item={editItem} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        confirmLabel={tCommon('actions.remove')}
        message={t('deleteConfirm.message')}
      />
    </div>
  );
}

function AssignForm({ stores, products, onSubmit, onCancel }: { stores: Store[]; products: Product[]; onSubmit: (d: any) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation('productStores');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({ store_id: '', product_id: '', expected_qty: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.store_id) errs.store_id = t('errors.storeRequired');
    if (!form.product_id) errs.product_id = t('errors.productRequired');
    if (!form.expected_qty) errs.expected_qty = t('errors.quantityRequired');
    else if (isNaN(Number(form.expected_qty)) || Number(form.expected_qty) < 0) errs.expected_qty = t('errors.quantityInvalid');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({ store_id: form.store_id, product_id: form.product_id, expected_qty: Number(form.expected_qty) });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Select label={t('fields.store')} value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })} options={stores.map((s) => ({ value: s.id, label: s.name }))} placeholder={t('fields.storePlaceholder')} error={errors.store_id} />
      <Select label={t('fields.product')} value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} placeholder={t('fields.productPlaceholder')} error={errors.product_id} />
      <Input label={t('fields.expectedQuantity')} type="number" min="0" value={form.expected_qty} onChange={(e) => setForm({ ...form, expected_qty: e.target.value })} error={errors.expected_qty} placeholder={t('fields.expectedQuantityPlaceholder')} />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{tCommon('actions.assign')}</Button>
      </div>
    </form>
  );
}

function EditQtyForm({ item, onSubmit, onCancel }: { item: ProductStore; onSubmit: (qty: number) => Promise<void>; onCancel: () => void }) {
  const { t } = useTranslation('productStores');
  const { t: tCommon } = useTranslation('common');
  const [qty, setQty] = useState(item.expected_qty.toString());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || isNaN(Number(qty)) || Number(qty) < 0) { setError(t('errors.quantityInvalid')); return; }
    setLoading(true);
    await onSubmit(Number(qty));
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ marginBottom: 16, color: 'var(--gray-600)' }}>
        <Trans
          t={t}
          i18nKey="editQtyForm.itemLabel"
          values={{ product: item.product?.name, store: item.store?.name }}
          components={{ b: <strong /> }}
        />
      </p>
      <Input label={t('fields.expectedQuantity')} type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} error={error} autoFocus />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{tCommon('actions.update')}</Button>
      </div>
    </form>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
