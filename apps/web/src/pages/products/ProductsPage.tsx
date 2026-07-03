import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
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
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.distributeur.toLowerCase().includes(search.toLowerCase()) ||
      p.famille.toLowerCase().includes(search.toLowerCase()) ||
      p.sous_famille.toLowerCase().includes(search.toLowerCase()) ||
      p.format.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (data: any) => {
    const res = await dispatch(createProduct(data));
    if (createProduct.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      setCreateOpen(false);
    } else {
      toast.error(res.payload as string || t('toasts.createError'));
    }
  };

  const handleUpdate = async (data: any) => {
    if (!editProduct) return;
    const res = await dispatch(updateProduct({ id: editProduct.id, payload: data }));
    if (updateProduct.fulfilled.match(res)) {
      toast.success(t('toasts.updateSuccess'));
      setEditProduct(null);
    } else {
      toast.error(res.payload as string || t('toasts.updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await dispatch(deleteProduct(deleteId));
    setDeleting(false);
    if (deleteProduct.fulfilled.match(res)) {
      toast.success(t('toasts.deleteSuccess'));
      setDeleteId(null);
    } else {
      toast.error(res.payload as string || t('toasts.deleteError'));
    }
  };

  const columns = [
    { key: 'name', header: t('table.product'), render: (p: Product) => <span style={{ fontWeight: 500 }}>{p.name}</span> },
    { key: 'sku', header: t('table.sku'), render: (p: Product) => <span style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{p.sku}</span> },
    { key: 'category', header: t('table.category'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.category}</span> },
    { key: 'distributeur', header: t('table.distributeur'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.distributeur}</span> },
    { key: 'famille', header: t('table.famille'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.famille}</span> },
    { key: 'sous_famille', header: t('table.sousFamille'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.sous_famille}</span> },
    { key: 'format', header: t('table.format'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.format}</span> },
    { key: 'created_at', header: t('table.created'), render: (p: Product) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(p.created_at, i18n.language)}</span> },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (p: Product) => (
        <div className="table-actions">
          <Button variant="outline" size="sm" onClick={() => setEditProduct(p)}>{tCommon('actions.edit')}</Button>
          <Button variant="danger" size="sm" onClick={() => setDeleteId(p.id)}>{tCommon('actions.delete')}</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={<Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addProduct')}</Button>}
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
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={filtered} loading={loading} keyExtractor={(p) => p.id} emptyMessage={t('table.empty')} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createProduct')} size="sm">
        <ProductForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={t('editProduct')} size="sm">
        {editProduct && (
          <ProductForm initialData={editProduct} onSubmit={handleUpdate} onCancel={() => setEditProduct(null)} />
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
