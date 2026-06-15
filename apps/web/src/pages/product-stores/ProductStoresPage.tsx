import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProductStores, createProductStore, updateProductStore, deleteProductStore } from '../../store/slices/productStoresSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProducts } from '../../store/slices/productsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import type { ProductStore, Store, Product } from '../../types';

export default function ProductStoresPage() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.productStores);
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductStore | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterStore, setFilterStore] = useState('');

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

  const handleCreate = async (data: any) => {
    const res = await dispatch(createProductStore(data));
    if (createProductStore.fulfilled.match(res)) {
      toast.success('Product assigned to store');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to assign product');
    }
  };

  const handleUpdate = async (expected_qty: number) => {
    if (!editItem) return;
    const res = await dispatch(updateProductStore({ id: editItem.id, payload: { expected_qty } }));
    if (updateProductStore.fulfilled.match(res)) {
      toast.success('Quantity updated');
      setEditItem(null);
    } else {
      toast.error(res.payload as string || 'Failed to update quantity');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteProductStore(deleteId));
    setDeleting(false);
    if (deleteProductStore.fulfilled.match(res)) {
      toast.success('Assignment removed');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to remove assignment');
    }
  };

  const columns = [
    { key: 'store', header: 'Store', render: (ps: ProductStore) => <span style={{ fontWeight: 500 }}>{ps.store?.name || ps.store_id}</span> },
    { key: 'product', header: 'Product', render: (ps: ProductStore) => <span>{ps.product?.name || ps.product_id}</span> },
    { key: 'sku', header: 'SKU', render: (ps: ProductStore) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{ps.product?.sku || '—'}</span> },
    { key: 'category', header: 'Category', render: (ps: ProductStore) => <span style={{ color: 'var(--gray-500)' }}>{ps.product?.category || '—'}</span> },
    { key: 'expected_qty', header: 'Expected Qty', render: (ps: ProductStore) => <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{ps.expected_qty}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (ps: ProductStore) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditItem(ps)}>Edit Qty</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(ps.id)}>Remove</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Product Inventory"
        subtitle="Assign products to stores with expected quantities"
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>Assign Product</Button>}
      />

      <div className="filter-bar">
        <Select
          options={stores.map((s) => ({ value: s.id, label: s.name }))}
          placeholder="All stores"
          value={filterStore}
          onChange={(e) => setFilterStore(e.target.value)}
          label=""
        />
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={items} loading={loading} keyExtractor={(ps) => ps.id} emptyMessage="No product assignments found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Assign Product to Store" size="sm">
        <AssignForm stores={stores} products={products} onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Update Expected Quantity" size="sm">
        {editItem && (
          <EditQtyForm item={editItem} onSubmit={handleUpdate} onCancel={() => setEditItem(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        confirmLabel="Remove"
        message="This will remove the product assignment from the store."
      />
    </div>
  );
}

function AssignForm({ stores, products, onSubmit, onCancel }: { stores: Store[]; products: Product[]; onSubmit: (d: any) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState({ store_id: '', product_id: '', expected_qty: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.store_id) errs.store_id = 'Store is required';
    if (!form.product_id) errs.product_id = 'Product is required';
    if (!form.expected_qty) errs.expected_qty = 'Quantity is required';
    else if (isNaN(Number(form.expected_qty)) || Number(form.expected_qty) < 0) errs.expected_qty = 'Invalid quantity';
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
      <Select label="Store" value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })} options={stores.map((s) => ({ value: s.id, label: s.name }))} placeholder="Select store" error={errors.store_id} />
      <Select label="Product" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} placeholder="Select product" error={errors.product_id} />
      <Input label="Expected Quantity" type="number" min="0" value={form.expected_qty} onChange={(e) => setForm({ ...form, expected_qty: e.target.value })} error={errors.expected_qty} placeholder="e.g. 50" />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Assign</Button>
      </div>
    </form>
  );
}

function EditQtyForm({ item, onSubmit, onCancel }: { item: ProductStore; onSubmit: (qty: number) => Promise<void>; onCancel: () => void }) {
  const [qty, setQty] = useState(item.expected_qty.toString());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || isNaN(Number(qty)) || Number(qty) < 0) { setError('Invalid quantity'); return; }
    setLoading(true);
    await onSubmit(Number(qty));
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ marginBottom: 16, color: 'var(--gray-600)' }}>
        <strong>{item.product?.name}</strong> at <strong>{item.store?.name}</strong>
      </p>
      <Input label="Expected Quantity" type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} error={error} autoFocus />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Update</Button>
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
