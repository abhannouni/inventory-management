import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { updatePromoItem } from '../../store/slices/promosSlice';
import type { PromoItem } from '../../types';

interface Props {
  item: PromoItem;
  onClose: () => void;
}

export default function EditPromoItemModal({ item, onClose }: Props) {
  const { t } = useTranslation('promos');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();

  const [contenance, setContenance] = useState(item.contenance);
  const [originalPrice, setOriginalPrice] = useState(item.original_price);
  const [promoPrice, setPromoPrice] = useState(item.promo_price);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!contenance.trim()) errs.contenance = t('errors.contenanceRequired');
    const original = Number(originalPrice);
    if (!originalPrice || Number.isNaN(original) || original <= 0) errs.original_price = t('errors.originalPriceRequired');
    const promo = Number(promoPrice);
    if (!promoPrice || Number.isNaN(promo) || promo <= 0) errs.promo_price = t('errors.promoPriceRequired');
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    const res = await dispatch(
      updatePromoItem({
        itemId: item.id,
        payload: { contenance: contenance.trim(), original_price: original, promo_price: promo },
      }),
    );
    setLoading(false);
    if (updatePromoItem.fulfilled.match(res)) {
      toast.success(t('toasts.updateItemSuccess'));
      onClose();
    } else {
      toast.error((res.payload as string) || t('toasts.updateItemError'));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--gray-600)' }}>
        {item.product?.name} <span style={{ color: 'var(--gray-400)' }}>({item.product?.sku})</span>
      </div>
      <Input label={t('form.contenance')} value={contenance} onChange={(e) => setContenance(e.target.value)} error={errors.contenance} />
      <Input label={t('form.originalPrice')} type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} error={errors.original_price} />
      <Input label={t('form.promoPrice')} type="number" min="0" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} error={errors.promo_price} />
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onClose} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{tCommon('actions.update')}</Button>
      </div>
    </form>
  );
}
