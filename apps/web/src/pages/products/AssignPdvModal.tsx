import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchStores } from '../../store/slices/storesSlice';
import { fetchProductStores, createProductStore, deleteProductStore } from '../../store/slices/productStoresSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import MultiSelectSearch from '../../components/ui/MultiSelectSearch';
import type { Product, ProductStore, Store } from '../../types';

interface AssignPdvModalProps {
  product: Product | null;
  onClose: () => void;
}

/**
 * Lets a product be assigned to (or removed from) any number of points of
 * sale without visiting each POS individually. Reuses the product-store
 * endpoints one call at a time — bulk-assign is store-keyed (it replaces a
 * store's whole product list), so it can't be used from the product side.
 */
export default function AssignPdvModal({ product, onClose }: AssignPdvModalProps) {
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { items: stores } = useAppSelector((s) => s.stores);

  const [assignments, setAssignments] = useState<ProductStore[]>([]);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    setLoadingAssignments(true);
    dispatch(fetchStores());
    dispatch(fetchProductStores({ product_id: product.id })).then((res) => {
      if (cancelled) return;
      if (fetchProductStores.fulfilled.match(res)) {
        setAssignments(res.payload);
        setSelectedStoreIds(res.payload.map((ps) => ps.store_id));
      }
      setLoadingAssignments(false);
    });
    return () => { cancelled = true; };
  }, [product, dispatch]);

  const handleSave = async () => {
    if (!product) return;
    const initialIds = assignments.map((ps) => ps.store_id);
    const toAdd = selectedStoreIds.filter((id) => !initialIds.includes(id));
    const toRemove = assignments.filter((ps) => !selectedStoreIds.includes(ps.store_id));

    if (!toAdd.length && !toRemove.length) {
      onClose();
      return;
    }

    setSaving(true);
    const addResults = await Promise.all(
      toAdd.map((store_id) => dispatch(createProductStore({ product_id: product.id, store_id, expected_qty: 0 }))),
    );
    const removeResults = await Promise.all(
      toRemove.map((ps) => dispatch(deleteProductStore(ps.id))),
    );
    setSaving(false);

    const hasError =
      addResults.some((r) => createProductStore.rejected.match(r)) ||
      removeResults.some((r) => deleteProductStore.rejected.match(r));

    if (hasError) {
      toast.error(t('assignPdv.toasts.error'));
    } else {
      toast.success(t('assignPdv.toasts.success'));
      onClose();
    }
  };

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={t('assignPdv.title', { name: product?.name ?? '' })}
      size="sm"
    >
      {loadingAssignments ? (
        <Spinner center />
      ) : (
        <>
          <MultiSelectSearch<Store>
            label={t('assignPdv.searchLabel')}
            placeholder={t('assignPdv.searchPlaceholder')}
            items={stores}
            selectedIds={selectedStoreIds}
            onChange={setSelectedStoreIds}
            getKey={(s) => s.id}
            getPrimary={(s) => s.name}
            getSecondary={(s) => s.city ?? s.brand ?? undefined}
            noResultsLabel={t('assignPdv.noResults')}
            typeToSearchLabel={t('assignPdv.typeToSearch')}
          />

          <div style={{ marginTop: 8, color: 'var(--gray-500)', fontSize: 12 }}>
            {t('assignPdv.selectedCount', { count: selectedStoreIds.length })}
          </div>

          <div className="form-actions">
            <Button variant="ghost" type="button" onClick={onClose} disabled={saving}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="button" loading={saving} onClick={handleSave}>
              {tCommon('actions.save')}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
