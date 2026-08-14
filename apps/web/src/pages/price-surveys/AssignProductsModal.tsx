import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchAssignments, saveAssignments } from '../../store/slices/priceSurveysSlice';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import MultiSelectSearch from '../../components/ui/MultiSelectSearch';
import type { Product } from '../../types';

interface AssignProductsModalProps {
  open: boolean;
  userId: string;
  storeId: string;
  userName: string;
  onClose: () => void;
  onSaved: () => void;
}

/** Super Admin / Admin: manage which products appear on one user's price survey for one PDV. */
export default function AssignProductsModal({ open, userId, storeId, userName, onClose, onSaved }: AssignProductsModalProps) {
  const { t } = useTranslation('priceSurveys');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector((s) => s.products);

  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    dispatch(fetchAssignments({ userId, storeId })).then((res) => {
      if (cancelled) return;
      if (fetchAssignments.fulfilled.match(res)) {
        setSelectedProductIds(res.payload.map((a) => a.product_id));
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, userId, storeId, dispatch]);

  const handleSave = async () => {
    setSaving(true);
    const res = await dispatch(saveAssignments({ userId, storeId, productIds: selectedProductIds }));
    setSaving(false);
    if (saveAssignments.fulfilled.match(res)) {
      toast.success(t('admin.assignProducts.toasts.success'));
      onSaved();
      onClose();
    } else {
      toast.error(t('admin.assignProducts.toasts.error'));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t('admin.assignProducts.title', { name: userName })} size="md">
      {loading ? (
        <Spinner center />
      ) : (
        <>
          <MultiSelectSearch<Product>
            label={t('admin.assignProducts.searchLabel')}
            placeholder={t('admin.assignProducts.searchPlaceholder')}
            items={products}
            selectedIds={selectedProductIds}
            onChange={setSelectedProductIds}
            getKey={(p) => p.id}
            getPrimary={(p) => p.name}
            getSecondary={(p) => p.sku}
            noResultsLabel={t('admin.assignProducts.noResults')}
            typeToSearchLabel={t('admin.assignProducts.typeToSearch')}
          />

          <div style={{ marginTop: 8, color: 'var(--gray-500)', fontSize: 12 }}>
            {t('admin.assignProducts.selectedCount', { count: selectedProductIds.length })}
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
