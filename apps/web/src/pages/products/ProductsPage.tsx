import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { usePermissions } from '../../hooks/usePermissions';
import { useClientPagination } from '../../hooks/useClientPagination';
import { fetchProducts, createProduct, updateProduct, deleteProduct } from '../../store/slices/productsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import ProductForm from './ProductForm';
import ProductBulkImportModal from './ProductBulkImportModal';
import AssignPdvModal from './AssignPdvModal';
import { formatDate } from '../../utils/format';
import type { Product } from '../../types';
import { getProductClassificationLabel } from '../../utils/productClassification';

export default function ProductsPage() {
  const { t, i18n } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const p = usePermissions();
  const { items: products, loading } = useAppSelector((s) => s.products);

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [pdvProduct, setPdvProduct] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [distributeurFilter, setDistributeurFilter] = useState('');
  const [familleFilter, setFamilleFilter] = useState('');
  const [sousFamilleFilter, setSousFamilleFilter] = useState('');
  const [formatFilter, setFormatFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { dispatch(fetchProducts()); }, [dispatch]);

  const toOptions = (values: (string | null | undefined)[]) =>
    Array.from(new Set(values.filter((v): v is string => !!v)))
      .sort((a, b) => a.localeCompare(b))
      .map((v) => ({ value: v, label: v }));

  const categoryOptions = useMemo(() => toOptions(products.map((p) => p.category)), [products]);
  const distributeurOptions = useMemo(() => toOptions(products.map((p) => p.distributeur)), [products]);
  const familleOptions = useMemo(() => toOptions(products.map((p) => p.famille)), [products]);
  const sousFamilleOptions = useMemo(() => toOptions(products.map((p) => p.sous_famille)), [products]);
  const formatOptions = useMemo(() => toOptions(products.map((p) => p.format)), [products]);

  const hasActiveFilters =
    !!search || !!categoryFilter || !!distributeurFilter || !!familleFilter || !!sousFamilleFilter || !!formatFilter || !!statusFilter;

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('');
    setDistributeurFilter('');
    setFamilleFilter('');
    setSousFamilleFilter('');
    setFormatFilter('');
    setStatusFilter('');
  };

  const filtered = products.filter(
    (p) =>
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.distributeur.toLowerCase().includes(search.toLowerCase()) ||
        p.famille.toLowerCase().includes(search.toLowerCase()) ||
        p.sous_famille.toLowerCase().includes(search.toLowerCase()) ||
        p.format.toLowerCase().includes(search.toLowerCase())) &&
      (!categoryFilter || p.category === categoryFilter) &&
      (!distributeurFilter || p.distributeur === distributeurFilter) &&
      (!familleFilter || p.famille === familleFilter) &&
      (!sousFamilleFilter || p.sous_famille === sousFamilleFilter) &&
      (!formatFilter || p.format === formatFilter) &&
      (!statusFilter || (statusFilter === 'active' ? p.is_active : !p.is_active))
  );

  const { pageItems, meta, setPage, setLimit } = useClientPagination(filtered);

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
    {
      key: 'classification',
      header: t('table.classification'),
      render: (p: Product) => {
        const label = getProductClassificationLabel(p.is_our_product, p.distributeur);
        return <Badge variant={label === 'Bourchanin' ? 'success' : 'gray'}>{label}</Badge>;
      },
    },
    { key: 'famille', header: t('table.famille'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.famille}</span> },
    { key: 'sous_famille', header: t('table.sousFamille'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.sous_famille}</span> },
    { key: 'format', header: t('table.format'), render: (p: Product) => <span style={{ color: 'var(--gray-600)' }}>{p.format}</span> },
    { key: 'created_at', header: t('table.created'), render: (p: Product) => <span style={{ color: 'var(--gray-500)' }}>{formatDate(p.created_at, i18n.language)}</span> },
    {
      key: 'actions',
      header: tCommon('table.actions'),
      render: (row: Product) => (
        <div className="table-actions">
          {p.can('products.update') && (
            <Button variant="outline" size="sm" onClick={() => setEditProduct(row)}>{tCommon('actions.edit')}</Button>
          )}
          {p.canManageProductStores && (
            <Button variant="outline" size="sm" onClick={() => setPdvProduct(row)}>{t('assignPdv.action')}</Button>
          )}
          {p.can('products.delete') && (
            <Button variant="danger" size="sm" onClick={() => setDeleteId(row.id)}>{tCommon('actions.delete')}</Button>
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
          p.can('products.create') ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="outline" icon={<UploadIcon />} onClick={() => setImportOpen(true)}>{t('bulkImport.button')}</Button>
              <Button icon={<PlusIcon />} onClick={() => setCreateOpen(true)}>{t('addProduct')}</Button>
            </div>
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
          options={categoryOptions}
          placeholder={t('filters.allCategories')}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={distributeurOptions}
          placeholder={t('filters.allDistributeurs')}
          value={distributeurFilter}
          onChange={(e) => setDistributeurFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={familleOptions}
          placeholder={t('filters.allFamilles')}
          value={familleFilter}
          onChange={(e) => setFamilleFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={sousFamilleOptions}
          placeholder={t('filters.allSousFamilles')}
          value={sousFamilleFilter}
          onChange={(e) => setSousFamilleFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={formatOptions}
          placeholder={t('filters.allFormats')}
          value={formatFilter}
          onChange={(e) => setFormatFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        <Select
          options={[
            { value: 'active', label: tCommon('status.active') },
            { value: 'inactive', label: tCommon('status.inactive') },
          ]}
          placeholder={t('filters.allStatuses')}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ minWidth: 160 }}
        />
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>{t('filters.clear')}</Button>
        )}
      </div>

      <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
        <DataTable columns={columns} data={pageItems} loading={loading} keyExtractor={(p) => p.id} emptyMessage={t('table.empty')} />
        <Pagination meta={meta} onPageChange={setPage} onLimitChange={setLimit} />
      </motion.div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('createProduct')} size="sm">
        <ProductForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} />
      </Modal>

      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={t('editProduct')} size="sm">
        {editProduct && (
          <ProductForm initialData={editProduct} onSubmit={handleUpdate} onCancel={() => setEditProduct(null)} />
        )}
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title={t('bulkImport.title')} size="md">
        <ProductBulkImportModal onClose={() => setImportOpen(false)} />
      </Modal>

      <AssignPdvModal product={pdvProduct} onClose={() => setPdvProduct(null)} />

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

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
