import { useTranslation } from 'react-i18next';
import MultiSelectSearch from '../../components/ui/MultiSelectSearch';
import type { Product } from '../../types';

export interface ProductAssignmentValue {
  product_id: string;
  expected_qty: number;
}

interface StoreProductsPickerProps {
  products: Product[];
  value: ProductAssignmentValue[];
  onChange: (next: ProductAssignmentValue[]) => void;
}

/**
 * Search-and-pick UI for the products assigned to a store, with a per-product
 * expected quantity. Shared between the store create/edit form and the
 * standalone "Add Products" modal on the store detail page.
 */
export default function StoreProductsPicker({ products, value, onChange }: StoreProductsPickerProps) {
  const { t } = useTranslation('stores');

  const selectedIds = value.map((v) => v.product_id);

  const handleSelectionChange = (ids: string[]) => {
    const qtyById = new Map(value.map((v) => [v.product_id, v.expected_qty]));
    onChange(ids.map((id) => ({ product_id: id, expected_qty: qtyById.get(id) ?? 0 })));
  };

  const handleQtyChange = (productId: string, qty: number) => {
    onChange(value.map((v) => (v.product_id === productId ? { ...v, expected_qty: qty } : v)));
  };

  return (
    <div>
      <MultiSelectSearch<Product>
        label={t('form.productsPicker.label')}
        placeholder={t('form.productsPicker.placeholder')}
        items={products}
        selectedIds={selectedIds}
        onChange={handleSelectionChange}
        getKey={(p) => p.id}
        getPrimary={(p) => p.name}
        getSecondary={(p) => p.sku}
        noResultsLabel={t('form.productsPicker.noResults')}
        typeToSearchLabel={t('form.productsPicker.typeToSearch')}
      />

      <div style={{ marginTop: 8, color: 'var(--gray-500)', fontSize: 12 }}>
        {t('form.productsPicker.selectedCount', { count: value.length })}
      </div>

      {value.length > 0 && (
        <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 8, marginTop: 8 }}>
          {value.map((v) => {
            const product = products.find((p) => p.id === v.product_id);
            return (
              <div
                key={v.product_id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderBottom: '1px solid var(--gray-100)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {product?.name ?? v.product_id}
                  </div>
                  {product?.sku && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{product.sku}</div>}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>
                    {t('form.productsPicker.expectedQtyLabel')}
                  </span>
                  <input
                    type="number"
                    min={0}
                    className="form-input"
                    style={{ width: 80 }}
                    value={v.expected_qty}
                    onChange={(e) => handleQtyChange(v.product_id, Math.max(0, Number(e.target.value) || 0))}
                    aria-label={t('form.productsPicker.expectedQtyAriaLabel', { name: product?.name ?? '' })}
                  />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
