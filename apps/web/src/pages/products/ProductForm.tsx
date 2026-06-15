import { useState } from 'react';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import type { Product } from '../../types';

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSubmit, onCancel }: ProductFormProps) {
  const [form, setForm] = useState({
    name: initialData?.name || '',
    sku: initialData?.sku || '',
    category: initialData?.category || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.sku.trim()) errs.sku = 'SKU is required';
    if (!form.category.trim()) errs.category = 'Category is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({ name: form.name.trim(), sku: form.sku.trim().toUpperCase(), category: form.category.trim() });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} placeholder="e.g. Coca-Cola 330ml" />
      <div className="form-row">
        <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} error={errors.sku} placeholder="e.g. CC330" />
        <Input label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} error={errors.category} placeholder="e.g. Beverages" />
      </div>
      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{initialData ? 'Update Product' : 'Create Product'}</Button>
      </div>
    </form>
  );
}
