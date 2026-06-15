import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../store/slices/productsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ProductForm from './ProductForm';
import { formatDate } from '../../utils/format';
import type { Product } from '../../types';

export default function ProductsPage() {
  const dispatch = useAppDispatch();
  const { items: products, loading } = useAppSelector((s) => s.products);

  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: any) => {
    const res = await dispatch(createProduct(data));
    if (createProduct.fulfilled.match(res)) {
      toast.success('Product created');
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || 'Failed to create product');
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editProduct) return;
    const res = await dispatch(updateProduct({ id: editProduct.id, payload: data }));
    if (updateProduct.fulfilled.match(res)) {
      toast.success('Product updated');
      setEditProduct(null);
    } else {
      toast.error(res.payload as string || 'Failed to update product');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteProduct(deleteId));
    setDeleting(false);
    if (deleteProduct.fulfilled.match(res)) {
      toast.success('Product deleted');
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || 'Failed to delete product');
    }
  };

  const columns = [
    { key: 'name', header: 'Product', render: (p: Product) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
    { key: 'sku', header: 'SKU', render: (p: Product) => <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{p.sku}</span> },
    { key: 'category', header: 'Category', render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.category}</span> },
    { key: 'created_at', header: 'Created', render: (p: Product) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(p.created_at)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      render: (p: Product) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditProduct(p)}>Edit</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle="Manage the product catalog"
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>Add Product</Button>}
      />

      <div className="filter-bar">
        <div className="form-group" style={{ flex: 1, maxWidth: 320 }}>
          <input
            className="form-input"
            placeholder="Search by name, SKU or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={filtered} loading={loading} keyExtractor={(p) => p.id} emptyMessage="No products found" />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Product" size="sm">
        <ProductForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title="Edit Product" size="sm">
        {editProduct && (
          <ProductForm initialData={editProduct} onSubmit={handleUpdate} onCancel={() => setEditProduct(null)} />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        message="This will permanently delete the product."
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
