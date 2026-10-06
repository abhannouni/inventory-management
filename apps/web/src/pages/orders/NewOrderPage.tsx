import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ordersApi, type LastPrices } from '../../api/orders.api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProducts } from '../../store/slices/productsSlice';
import { fetchStores } from '../../store/slices/storesSlice';
import type { Product, Store } from '../../types';
import { InvoiceLines, InvoiceTotals } from './InvoiceDocument';
import SearchPicker from './SearchPicker';
import { DEFAULT_TVA, TVA_PRESETS, formatMoney, lineTotals, sumTotals } from './orderMath';
import './orders.css';

interface Line {
  key: number;
  query: string;
  product: Product | null;
  quantity: string;
  unitPrice: string;
  tvaRate: string;
  /** Where the prefilled price came from, until the user edits it. */
  priceSource: 'here' | 'elsewhere' | null;
}

type LineErrors = Partial<Record<'product' | 'quantity' | 'unitPrice' | 'tvaRate', string>>;

let nextKey = 1;
const newLine = (tvaRate = String(DEFAULT_TVA)): Line => ({
  key: nextKey++,
  query: '',
  product: null,
  quantity: '1',
  unitPrice: '',
  tvaRate,
  priceSource: null,
});

/** Accepts "12,5" as well as "12.5" — a comma is the local decimal separator. */
const toNumber = (value: string) => Number(value.replace(',', '.').trim());
const MONEY_RE = /^\d+([.,]\d{1,2})?$/;

/**
 * Passage de commande: pick the point of sale, add the products with their
 * quantity, unit price HT and TVA (both editable), review, then confirm —
 * which creates the order and its invoice in one step.
 */
export default function NewOrderPage() {
  const { t, i18n } = useTranslation('orders');
  const lang = i18n.language;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const { items: stores } = useAppSelector((s) => s.stores);
  const { items: products } = useAppSelector((s) => s.products);

  useEffect(() => {
    if (!stores.length) dispatch(fetchStores());
    if (!products.length) dispatch(fetchProducts());
  }, [dispatch, stores.length, products.length]);

  const [storeId, setStoreId] = useState(params.get('store') ?? '');
  const [storeQuery, setStoreQuery] = useState('');
  const store: Store | null = stores.find((s) => s.id === storeId) ?? null;

  const [lines, setLines] = useState<Line[]>(() => [newLine()]);
  const [errors, setErrors] = useState<Record<number, LineErrors>>({});
  const [storeError, setStoreError] = useState<string>();
  const [notes, setNotes] = useState('');
  const [lastPrices, setLastPrices] = useState<LastPrices>({});
  const [focusKey, setFocusKey] = useState<number | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let current = true;
    ordersApi
      .lastPrices(storeId)
      .then((p) => current && setLastPrices(p))
      .catch(() => current && setLastPrices({}));
    return () => {
      current = false;
    };
  }, [storeId]);

  const storeMatches = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    if (!q) return [];
    return stores
      .filter((s) => s.is_active && (s.name.toLowerCase().includes(q) || (s.city ?? '').toLowerCase().includes(q)))
      .slice(0, 8);
  }, [stores, storeQuery]);

  const picked = new Set(lines.map((l) => l.product?.id).filter(Boolean));
  const productMatches = (line: Line) => {
    const q = line.query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.is_active !== false)
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .filter((p) => p.id === line.product?.id || !picked.has(p.id))
      .slice(0, 8);
  };

  const update = (key: number, patch: Partial<Line>) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev[key] };
      for (const field of Object.keys(patch)) delete next[(field === 'query' ? 'product' : field) as keyof LineErrors];
      return { ...prev, [key]: next };
    });
  };

  const pickProduct = (line: Line, product: Product) => {
    const last = lastPrices[product.id];
    update(line.key, {
      product,
      query: product.name,
      ...(last
        ? {
            unitPrice: String(last.unit_price),
            tvaRate: String(last.tva_rate),
            priceSource: last.at_this_store ? 'here' : 'elsewhere',
          }
        : { priceSource: null }),
    });
  };

  const addLine = () => {
    const line = newLine(lines[lines.length - 1]?.tvaRate ?? String(DEFAULT_TVA));
    setLines((prev) => [...prev, line]);
    setFocusKey(line.key);
  };

  const applyTvaToAll = (rate: number) => setLines((prev) => prev.map((l) => ({ ...l, tvaRate: String(rate) })));

  const computed = lines.map((l) => lineTotals(toNumber(l.quantity), toNumber(l.unitPrice), toNumber(l.tvaRate)));
  const totals = sumTotals(computed);

  const validate = () => {
    const errs: Record<number, LineErrors> = {};
    for (const l of lines) {
      const e: LineErrors = {};
      const qty = toNumber(l.quantity);
      const rate = toNumber(l.tvaRate);
      if (!l.product) e.product = t('form.errors.product');
      if (!Number.isInteger(qty) || qty <= 0) e.quantity = t('form.errors.quantity');
      if (!MONEY_RE.test(l.unitPrice.trim())) e.unitPrice = t('form.errors.unitPrice');
      if (!MONEY_RE.test(l.tvaRate.trim()) || rate > 100) e.tvaRate = t('form.errors.tvaRate');
      if (Object.keys(e).length) errs[l.key] = e;
    }
    return errs;
  };

  const openReview = () => {
    const errs = validate();
    setErrors(errs);
    setStoreError(store ? undefined : t('form.errors.store'));
    if (!store || Object.keys(errs).length) {
      if (Object.keys(errs).length) toast.error(t('form.errors.fixLines'));
      return;
    }
    setReviewing(true);
  };

  const confirm = async () => {
    if (!store) return;
    setSaving(true);
    try {
      const order = await ordersApi.create({
        store_id: store.id,
        notes: notes.trim() || undefined,
        items: lines.map((l) => ({
          product_id: l.product!.id,
          quantity: toNumber(l.quantity),
          unit_price: toNumber(l.unitPrice),
          tva_rate: toNumber(l.tvaRate),
        })),
      });
      toast.success(t('review.success', { number: order.number, invoice: order.invoice?.number ?? '' }));
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (e) {
      toast.error((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('form.title')}
        subtitle={store ? [store.name, store.city].filter(Boolean).join(' · ') : t('subtitle')}
        actions={
          <Link to={store ? `/pos/${store.id}` : '/orders'} className="btn btn-ghost">
            ‹ {t('form.back')}
          </Link>
        }
      />

      <div className="ord-layout">
        <div className="ord-main">
          {/* ── 1. Point of sale ── */}
          <section className="pos-card ord-step">
            <h3 className="pos-card-title">
              <span className="ord-step-num">1</span> {t('form.storeStep')}
            </h3>
            {store ? (
              <div className="ord-store">
                <div>
                  <strong>{store.name}</strong>
                  <span className="ord-muted">
                    {[store.brand, store.address, store.city, store.region?.name].filter(Boolean).join(' · ')}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setStoreId('');
                    setStoreQuery('');
                    setLastPrices({});
                  }}
                >
                  {t('form.change')}
                </Button>
              </div>
            ) : (
              <SearchPicker
                id="ord-store"
                label={t('form.storeStep')}
                placeholder={t('form.storeSearch')}
                query={storeQuery}
                onQueryChange={setStoreQuery}
                matches={storeMatches}
                onPick={(s) => {
                  setStoreId(s.id);
                  setStoreError(undefined);
                }}
                getKey={(s) => s.id}
                getPrimary={(s) => s.name}
                getSecondary={(s) => [s.city, s.region?.name].filter(Boolean).join(' · ') || undefined}
                noResultsLabel={t('form.noResults')}
                error={storeError}
              />
            )}
          </section>

          {/* ── 2. Products ── */}
          <section className="pos-card ord-step">
            <h3 className="pos-card-title">
              <span className="ord-step-num">2</span> {t('form.productsStep')}
            </h3>

            <div className="ord-tva-all">
              <span className="ord-muted">{t('form.applyTvaAll')}</span>
              {TVA_PRESETS.map((rate) => (
                <button key={rate} type="button" className="ord-chip" onClick={() => applyTvaToAll(rate)}>
                  {rate} %
                </button>
              ))}
            </div>

            <div className="ord-lines">
              {lines.map((line, index) => {
                const e = errors[line.key] ?? {};
                const c = computed[index];
                return (
                  <div key={line.key} className={`ord-line ${Object.keys(e).length ? 'has-error' : ''}`}>
                    <div className="ord-line-head">
                      <span className="ord-line-index">{index + 1}</span>
                      <div className="ord-line-product">
                        <SearchPicker
                          id={`ord-product-${line.key}`}
                          label={t('form.product')}
                          placeholder={t('form.productPlaceholder')}
                          query={line.query}
                          onQueryChange={(v) => update(line.key, { query: v, product: null })}
                          matches={productMatches(line)}
                          onPick={(p) => pickProduct(line, p)}
                          getKey={(p) => p.id}
                          getPrimary={(p) => p.name}
                          getSecondary={(p) => p.sku}
                          noResultsLabel={t('form.noResults')}
                          error={e.product}
                          autoFocus={line.key === focusKey}
                        />
                      </div>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="ord-line-remove"
                          onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                          aria-label={t('form.removeLine')}
                          title={t('form.removeLine')}
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div className="ord-line-fields">
                      <div className="form-group">
                        <label className="form-label" htmlFor={`ord-qty-${line.key}`}>{t('form.quantity')}</label>
                        <input
                          id={`ord-qty-${line.key}`}
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          className={`form-input ${e.quantity ? 'is-error' : ''}`}
                          value={line.quantity}
                          onChange={(ev) => update(line.key, { quantity: ev.target.value })}
                        />
                        {e.quantity && <p className="form-error">{e.quantity}</p>}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`ord-price-${line.key}`}>{t('form.unitPrice')}</label>
                        <input
                          id={`ord-price-${line.key}`}
                          inputMode="decimal"
                          className={`form-input ${e.unitPrice ? 'is-error' : ''}`}
                          placeholder="0,00"
                          value={line.unitPrice}
                          onChange={(ev) => update(line.key, { unitPrice: ev.target.value, priceSource: null })}
                        />
                        {e.unitPrice ? (
                          <p className="form-error">{e.unitPrice}</p>
                        ) : (
                          line.priceSource && (
                            <p className="form-hint">
                              {line.priceSource === 'here' ? t('form.lastPriceHere') : t('form.lastPriceElsewhere')}
                            </p>
                          )
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor={`ord-tva-${line.key}`}>{t('form.tvaRate')}</label>
                        <input
                          id={`ord-tva-${line.key}`}
                          inputMode="decimal"
                          list="ord-tva-presets"
                          className={`form-input ${e.tvaRate ? 'is-error' : ''}`}
                          value={line.tvaRate}
                          onChange={(ev) => update(line.key, { tvaRate: ev.target.value })}
                        />
                        {e.tvaRate && <p className="form-error">{e.tvaRate}</p>}
                      </div>
                    </div>

                    <dl className="ord-line-amounts">
                      <div>
                        <dt>{t('form.lineHt')}</dt>
                        <dd>{formatMoney(c.ht, lang)}</dd>
                      </div>
                      <div>
                        <dt>{t('form.lineTva')}</dt>
                        <dd>{formatMoney(c.tva, lang)}</dd>
                      </div>
                      <div className="is-strong">
                        <dt>{t('form.lineTtc')}</dt>
                        <dd>{formatMoney(c.ttc, lang)}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })}
            </div>

            <datalist id="ord-tva-presets">
              {TVA_PRESETS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            <button type="button" className="ord-add-line" onClick={addLine}>
              + {t('form.addLine')}
            </button>

            <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
              <label className="form-label" htmlFor="ord-notes">{t('form.notes')}</label>
              <textarea
                id="ord-notes"
                className="form-input"
                rows={2}
                maxLength={1000}
                placeholder={t('form.notesPlaceholder')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* ── Summary ── */}
        <aside className="pos-card ord-summary">
          <h3 className="pos-card-title">{t('form.summary')}</h3>
          <p className="ord-muted">{t('form.lines', { count: lines.length })}</p>
          <InvoiceTotals ht={totals.ht} tva={totals.tva} ttc={totals.ttc} />
          <Button className="ord-summary-btn" onClick={openReview}>
            {t('form.review')}
          </Button>
          <p className="ord-muted ord-summary-hint">{t('form.editable')}</p>
        </aside>
      </div>

      <Modal open={reviewing} onClose={() => !saving && setReviewing(false)} title={t('review.title')} size="xl">
        {reviewing && store && (
          <div>
            <p className="ord-muted" style={{ marginTop: 0 }}>{t('review.intro')}</p>
            <div className="ord-review-store">
              <span className="inv-party-label">{t('invoice.billedTo')}</span>
              <strong>{store.name}</strong>
              <span className="ord-muted">
                {[store.address, store.postal_code, store.city, store.region?.name].filter(Boolean).join(' · ')}
              </span>
            </div>
            <InvoiceLines
              rows={lines.map((l, i) => ({
                key: String(l.key),
                name: l.product!.name,
                sku: l.product!.sku,
                quantity: toNumber(l.quantity),
                unitPrice: toNumber(l.unitPrice),
                tvaRate: toNumber(l.tvaRate),
                ht: computed[i].ht,
                tva: computed[i].tva,
                ttc: computed[i].ttc,
              }))}
            />
            <div className="inv-foot">
              <div className="inv-notes">{notes.trim() && <p>{notes.trim()}</p>}</div>
              <InvoiceTotals ht={totals.ht} tva={totals.tva} ttc={totals.ttc} />
            </div>
            <div className="form-actions">
              <Button variant="ghost" onClick={() => setReviewing(false)} disabled={saving}>
                {t('review.back')}
              </Button>
              <Button onClick={confirm} loading={saving}>
                {t('review.confirm')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
