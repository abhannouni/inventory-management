import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import { BOURCHANIN_CANONICAL_NAME, isBourchaninDistributor } from '../../utils/productClassification';
import type { SellOutBatchPayload } from '../../api/sellOut.api';
import type { Product, Store } from '../../types';

interface SellOutFormProps {
  onSubmit: (data: SellOutBatchPayload) => Promise<void>;
  onCancel: () => void;
}

/** Same label the sell-out table uses for non-Bourchanin products. */
const CONCURRENT_LABEL = 'Concurrent';

function isProductBourchanin(product: Product) {
  return product.is_our_product || isBourchaninDistributor(product.distributeur);
}

interface Line {
  key: number;
  isBourchanin: boolean;
  query: string;
  product: Product | null;
  quantity: string;
  price: string;
}

type LineErrors = Partial<Record<'product' | 'quantity' | 'price', string>>;

let nextKey = 1;
const newLine = (isBourchanin = true): Line => ({
  key: nextKey++,
  isBourchanin,
  query: '',
  product: null,
  quantity: '',
  price: '',
});

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
  autoFocus?: boolean;
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
  autoFocus,
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
        autoFocus={autoFocus}
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

/**
 * Record a sell-out: pick the store once, then add as many products as were
 * sold there — each with its own quantity and price. Saved all together.
 */
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
  const [storeError, setStoreError] = useState<string>();

  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [lineErrors, setLineErrors] = useState<Record<number, LineErrors>>({});
  const [loading, setLoading] = useState(false);
  /** Only lines added with "+" grab focus — not the first one on open. */
  const [focusKey, setFocusKey] = useState<number | null>(null);

  const storeMatches = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    if (!q) return [];
    return stores.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 8);
  }, [stores, storeQuery]);

  const pickedIds = new Set(lines.map((l) => l.product?.id).filter(Boolean));

  const matchesFor = (line: Line) => {
    const q = line.query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => isProductBourchanin(p) === line.isBourchanin)
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .filter((p) => p.id === line.product?.id || !pickedIds.has(p.id))
      .slice(0, 8);
  };

  const updateLine = (key: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    // Editing a field clears its error.
    setLineErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev[key] };
      if ('product' in patch || 'query' in patch) delete next.product;
      if ('quantity' in patch) delete next.quantity;
      if ('price' in patch) delete next.price;
      return { ...prev, [key]: next };
    });
  };

  const addLine = () => {
    const line = newLine(lines[lines.length - 1]?.isBourchanin ?? true);
    setLines((prev) => [...prev, line]);
    setFocusKey(line.key);
  };

  const removeLine = (key: number) => setLines((prev) => prev.filter((l) => l.key !== key));

  const units = lines.reduce((sum, l) => sum + (Number(l.quantity) > 0 ? Number(l.quantity) : 0), 0);
  const amount = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) > 0 && Number(l.price) > 0 ? Number(l.quantity) * Number(l.price) : 0),
    0,
  );

  const validate = () => {
    const errs: Record<number, LineErrors> = {};
    for (const l of lines) {
      const e: LineErrors = {};
      if (!l.product) e.product = t('errors.productRequired');
      if (!l.quantity || !Number.isInteger(Number(l.quantity)) || Number(l.quantity) <= 0)
        e.quantity = t('errors.quantityRequired');
      if (!l.price || Number(l.price) <= 0) e.price = t('errors.priceRequired');
      if (Object.keys(e).length) errs[l.key] = e;
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    const missingStore = !selectedStore;
    setStoreError(missingStore ? t('errors.storeRequired') : undefined);
    setLineErrors(errs);
    if (missingStore || Object.keys(errs).length) return;
    setLoading(true);
    await onSubmit({
      store_id: selectedStore!.id,
      items: lines.map((l) => ({
        product_id: l.product!.id,
        quantity: Number(l.quantity),
        price: Number(l.price),
      })),
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
        onPick={(store) => { setSelectedStore(store); setStoreQuery(store.name); setStoreError(undefined); }}
        getKey={(store) => store.id}
        getPrimary={(store) => store.name}
        getSecondary={(store) => store.city || undefined}
        error={storeError}
        noResultsLabel={t('search.noResults')}
      />

      <div className="so-lines-head">
        <strong>{t('lines.title')}</strong>
        <span className="so-muted">{t('lines.count', { count: lines.length })}</span>
      </div>

      <div className="so-lines">
        {lines.map((line, index) => {
          const errs = lineErrors[line.key] ?? {};
          const qty = Number(line.quantity);
          const price = Number(line.price);
          return (
            <div key={line.key} className="so-line">
              <div className="so-line-top">
                <span className="so-line-index">{index + 1}</span>
                <div className="so-seg" role="radiogroup" aria-label={t('fields.isBourchanin')} title={t('fields.isBourchaninHint')}>
                  {[true, false].map((ours) => (
                    <button
                      key={String(ours)}
                      type="button"
                      role="radio"
                      aria-checked={line.isBourchanin === ours}
                      className={line.isBourchanin === ours ? 'is-active' : ''}
                      onClick={() =>
                        line.isBourchanin !== ours && updateLine(line.key, { isBourchanin: ours, product: null, query: '' })
                      }
                    >
                      {ours ? BOURCHANIN_CANONICAL_NAME : CONCURRENT_LABEL}
                    </button>
                  ))}
                </div>
                {lines.length > 1 && (
                  <button
                    type="button"
                    className="so-line-remove"
                    onClick={() => removeLine(line.key)}
                    aria-label={t('lines.remove')}
                    title={t('lines.remove')}
                  >
                    ✕
                  </button>
                )}
              </div>

              <SearchField
                label={t('fields.product')}
                placeholder={t('fields.productPlaceholder')}
                query={line.query}
                onQueryChange={(value) => updateLine(line.key, { query: value, product: null })}
                matches={matchesFor(line)}
                onPick={(product) => updateLine(line.key, { product, query: product.name })}
                getKey={(product) => product.id}
                getPrimary={(product) => product.name}
                getSecondary={(product) => product.sku}
                error={errs.product}
                noResultsLabel={t('search.noResults')}
                autoFocus={line.key === focusKey}
              />

              <div className="so-line-fields">
                <Input
                  label={t('fields.quantity')}
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  error={errs.quantity}
                  onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                />
                <Input
                  label={t('fields.price')}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.price}
                  error={errs.price}
                  onChange={(e) => updateLine(line.key, { price: e.target.value })}
                />
                <div className="so-line-total">
                  <span className="so-muted">{t('lines.lineTotal')}</span>
                  <strong>{qty > 0 && price > 0 ? (qty * price).toFixed(2) : '—'}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="so-add-line" onClick={addLine}>
        + {t('lines.add')}
      </button>

      <div className="so-summary">
        <span>
          {t('lines.count', { count: lines.length })} · {t('lines.totalUnits', { units })}
        </span>
        <span>
          {t('lines.total')} <strong>{amount.toFixed(2)}</strong>
        </span>
      </div>

      <div className="form-actions">
        <Button variant="ghost" type="button" onClick={onCancel} disabled={loading}>{tCommon('actions.cancel')}</Button>
        <Button type="submit" loading={loading}>{t('lines.submit', { count: lines.length })}</Button>
      </div>
    </form>
  );
}
