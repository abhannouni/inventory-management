import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import type { Product } from '../../types';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    category: initialData?.category || '',
    distributeur: initialData?.distributeur || '',
    famille: initialData?.famille || '',
    sous_famille: initialData?.sous_famille || '',
    format: initialData?.format || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = t('errors.nameRequired');
    if (!form.sku.trim()) errs.sku = t('errors.skuRequired');
    if (!form.category.trim()) errs.category = t('errors.categoryRequired');
    if (!form.distributeur.trim()) errs.distributeur = t('errors.distributeurRequired');
    if (!form.famille.trim()) errs.famille = t('errors.familleRequired');
    if (!form.sous_famille.trim()) errs.sous_famille = t('errors.sousFamilleRequired');
    if (!form.format.trim()) errs.format = t('errors.formatRequired');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category.trim(),
      distributeur: form.distributeur.trim(),
      famille: form.famille.trim(),
      sous_famille: form.sous_famille.trim(),
      format: form.format.trim(),
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label={t('fields.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder={t('fields.namePlaceholder')} />
      <div className="form-row">
        <Input label={t('fields.sku')} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} error={errors.sku} placeholder={t('fields.skuPlaceholder')} />
        <Input label={t('fields.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} error={errors.category} placeholder={t('fields.categoryPlaceholder')} />
      </div>
      <div className="form-row">
        <Input label={t('fields.distributeur')} value={form.distributeur} onChange={(e) => setForm({ ...form, distributeur: e.target.value })} error={errors.distributeur} placeholder={t('fields.distributeurPlaceholder')} />
        <Input label={t('fields.famille')} value={form.famille} onChange={(e) => setForm({ ...form, famille: e.target.value })} error={errors.famille} placeholder={t('fields.famillePlaceholder')} />
      </div>
      <div className="form-row">
        <Input label={t('fields.sousFamille')} value={form.sous_famille} onChange={(e) => setForm({ ...form, sous_famille: e.target.value })} error={errors.sous_famille} placeholder={t('fields.sousFamillePlaceholder')} />
        <Input label={t('fields.format')} value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} error={errors.format} placeholder={t('fields.formatPlaceholder')} />
      </div>
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{initialData ? t('updateProduct') : t('createProduct')}</Button>
      </div>
    </form>
  );
}
