import { useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import ProductSearchPicker from './ProductSearchPicker';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { createPromo } from '../../store/slices/promosSlice';
import type { CreatePromoPayload } from '../../api/promos.api';
import type { Product } from '../../types';

interface DraftLine {
  product: Product;
  contenance: string;
  original_price: string;
  promo_price: string;
}

interface Props {
  onClose: () => void;
}

export default function AddPromoModal({ onClose }: Props) {
  const { t } = useTranslation('promos');
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector((s) => s.products);

  const [title, setTitle] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [contenance, setContenance] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [lineError, setLineError] = useState('');
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddLine = () => {
    if (!selectedProduct) return setLineError(t('errors.productRequired'));
    if (!contenance.trim()) return setLineError(t('errors.contenanceRequired'));
    const original = Number(originalPrice);
    if (!originalPrice || Number.isNaN(original) || original <= 0) return setLineError(t('errors.originalPriceRequired'));
    const promo = Number(promoPrice);
    if (!promoPrice || Number.isNaN(promo) || promo <= 0) return setLineError(t('errors.promoPriceRequired'));

    setDraft((prev) => [
      ...prev,
      { product: selectedProduct, contenance: contenance.trim(), original_price: originalPrice, promo_price: promoPrice },
    ]);
    setSelectedProduct(null);
    setContenance('');
    setOriginalPrice('');
    setPromoPrice('');
    setLineError('');
  };

  const handleRemoveLine = (index: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublish = async () => {
    if (!draft.length) { setLineError(t('errors.itemsRequired')); return; }
    setSubmitting(true);
    const payload: CreatePromoPayload = {
      title: title.trim() || undefined,
      items: draft.map((line) => ({
        product_id: line.product.id,
        contenance: line.contenance,
        original_price: Number(line.original_price),
        promo_price: Number(line.promo_price),
      })),
    };
    const res = await dispatch(createPromo(payload));
    setSubmitting(false);
    if (createPromo.fulfilled.match(res)) {
      toast.success(t('toasts.createSuccess'));
      onClose();
    } else {
      toast.error((res.payload as string) || t('toasts.createError'));
    }
  };

  const handleAddLineClick = (e: FormEvent) => {
    e.preventDefault();
    handleAddLine();
  };

  return (
    <div>
      <Input label={t('form.titleLabel')} placeholder={t('form.titlePlaceholder')} value={title} onChange={(e) => setTitle(e.target.value)} />

      <form onSubmit={handleAddLineClick} className="card" style={{ padding: 16, marginTop: 4, marginBottom: 16 }}>
        <ProductSearchPicker
          products={products}
          excludeIds={draft.map((d) => d.product.id)}
          onSelect={(p) => { setSelectedProduct(p); setLineError(''); }}
          label={t('form.searchProduct')}
          placeholder={t('form.searchProduct')}
          noResultsLabel={t('form.noResults')}
          typeToSearchLabel={t('form.typeToSearch')}
        />
        {selectedProduct && (
          <div style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--gray-600)' }}>
            {selectedProduct.name} <span style={{ color: 'var(--gray-400)' }}>({selectedProduct.sku})</span>
          </div>
        )}
        <div className="form-row">
          <Input label={t('form.contenance')} placeholder={t('form.contenancePlaceholder')} value={contenance} onChange={(e) => setContenance(e.target.value)} />
          <Input label={t('form.originalPrice')} type="number" min="0" step="0.01" value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} />
          <Input label={t('form.promoPrice')} type="number" min="0" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} />
        </div>
        {lineError && <p className="form-error">{lineError}</p>}
        <Button type="submit" variant="outline" size="sm" style={{ marginTop: 4 }}>{t('form.addLine')}</Button>
      </form>

      {draft.length === 0 ? (
        <p style={{ color: 'var(--gray-500)', fontSize: 13, marginBottom: 16 }}>{t('form.draftEmpty')}</p>
      ) : (
        <div className="table-wrapper" style={{ marginBottom: 16 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('table.product')}</th>
                <th>{t('table.contenance')}</th>
                <th>{t('table.originalPrice')}</th>
                <th>{t('table.promoPrice')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {draft.map((line, i) => (
                <tr key={`${line.product.id}-${i}`}>
                  <td>{line.product.name}</td>
                  <td>{line.contenance}</td>
                  <td>{line.original_price}</td>
                  <td>{line.promo_price}</td>
                  <td className="col-actions">
                    <Button variant="danger" size="sm" type="button" onClick={() => handleRemoveLine(i)}>{t('form.removeLine')}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onClose} disabled={submitting}>{t('form.cancel')}</Button>
        <Button type="button" onClick={handlePublish} loading={submitting}>{t('form.publish')}</Button>
      </div>
    </div>
  );
}
