import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { isBourchaninDistributor } from '../../utils/productClassification';
import type { Product, Store } from '../../types';

interface SellOutFormProps {
  onSubmit: (data: { product_id: string; store_id: string; quantity: number; price: number }) => Promise<void>;
  onCancel: () => void;
}

function isProductBourchanin(product: Product) {
  return product.is_our_product || isBourchaninDistributor(product.distributeur);
}

interface SearchFieldProps<T> {
  label: string;
  placeholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  matches: T[];
  onPick: (item: T) => void;
  getKey: (item: T) => string;
  getPrimary: (item: T) => string;
  getSecondary?: (item: T) => string | undefined;
  error?: string;
  noResultsLabel: string;
}

function SearchField<T>({
  label,
  placeholder,
  query,
  onQueryChange,
  matches,
  onPick,
  getKey,
  getPrimary,
  getSecondary,
  error,
  noResultsLabel,
}: SearchFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  return (
    <div style={{ position: 'relative' }}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        error={error}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimeout.current = setTimeout(() => setOpen(false), 150);
        }}
        autoComplete="off"
      />
      {open && query.trim() && (
        <div className="search-dropdown" onMouseDown={(e) => e.preventDefault()}>
          {matches.length === 0 ? (
            <div className="search-dropdown-empty">{noResultsLabel}</div>
          ) : (
            matches.map((item) => (
              <div
                key={getKey(item)}
                className="search-dropdown-item"
                onClick={() => {
                  onPick(item);
                  setOpen(false);
                }}
              >
                <div>
                  <div className="search-dropdown-item-name">{getPrimary(item)}</div>
                  {getSecondary && <div className="search-dropdown-item-meta">{getSecondary(item)}</div>}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function SellOutForm({ onSubmit, onCancel }: SellOutFormProps) {
  const { t } = useTranslation('sellOut');
  const { t: tCommon } = useTranslation('common');
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector((s) => s.products);
  const { items: stores } = useAppSelector((s) => s.stores);

  useEffect(() => {
    if (products.length === 0) dispatch(fetchProducts());
    if (stores.length === 0) dispatch(fetchStores());
  }, [dispatch, products.length, stores.length]);

  const [storeQuery, setStoreQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

  const [isBourchanin, setIsBourchanin] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const storeMatches = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    if (!q) return [];
    return stores.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [stores, storeQuery]);

  const productMatches = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => isProductBourchanin(p) === isBourchanin)
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, productQuery, isBourchanin]);

  const handleToggleBourchanin = (checked: boolean) => {
    setIsBourchanin(checked);
    setSelectedProduct(null);
    setProductQuery('');
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedStore) errs.store = t('errors.storeRequired');
    if (!selectedProduct) errs.product = t('errors.productRequired');
    if (!quantity || Number(quantity) <= 0) errs.quantity = t('errors.quantityRequired');
    if (!price || Number(price) <= 0) errs.price = t('errors.priceRequired');
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    await onSubmit({
      product_id: selectedProduct!.id,
      store_id: selectedStore!.id,
      quantity: Number(quantity),
      price: Number(price),
    });
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <SearchField
        label={t('fields.store')}
        placeholder={t('fields.storePlaceholder')}
        query={storeQuery}
        onQueryChange={(value) => { setStoreQuery(value); setSelectedStore(null); }}
        matches={storeMatches}
        onPick={(store) => { setSelectedStore(store); setStoreQuery(store.name); }}
        getKey={(store) => store.id}
        getPrimary={(store) => store.name}
        getSecondary={(store) => store.city || undefined}
        error={errors.store}
        noResultsLabel={t('search.noResults')}
      />

      <div style={{ height: 18 }} />

      <label className="form-check-card">
        <input
          type="checkbox"
          checked={isBourchanin}
          onChange={(e) => handleToggleBourchanin(e.target.checked)}
        />
        <span>
          <span className="form-check-card-title">{t('fields.isBourchanin')}</span>
          <span className="form-check-card-hint">{t('fields.isBourchaninHint')}</span>
        </span>
      </label>

      <SearchField
        label={t('fields.product')}
        placeholder={t('fields.productPlaceholder')}
        query={productQuery}
        onQueryChange={(value) => { setProductQuery(value); setSelectedProduct(null); }}
        matches={productMatches}
        onPick={(product) => { setSelectedProduct(product); setProductQuery(product.name); }}
        getKey={(product) => product.id}
        getPrimary={(product) => product.name}
        getSecondary={(product) => product.sku}
        error={errors.product}
        noResultsLabel={t('search.noResults')}
      />

      <div className="form-row" style={{ marginTop: 18 }}>
        <Input
          label={t('fields.quantity')}
          type="number"
          min="1"
          step="1"
          value={quantity}
          error={errors.quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
        <Input
          label={t('fields.price')}
          type="number"
          min="0"
          step="0.01"
          value={price}
          error={errors.price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{t('addButton')}</Button>
      </div>
    </form>
  );
}
