import { useTranslation } from 'react-i18next';
import type { Order, StoreSnapshot } from '../../api/orders.api';
import Badge from '../../components/ui/Badge';
import { formatDate, formatDateOnly } from '../../utils/format';
import { formatMoney, formatRate } from './orderMath';
import './orders.css';

export interface InvoiceRow {
  key: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number | string;
  tvaRate: number | string;
  ht: number | string;
  tva: number | string;
  ttc: number | string;
}

export function OrderStatusBadge({ status }: { status: Order['status'] }) {
  const { t } = useTranslation('orders');
  return (
    <Badge variant={status === 'confirmed' ? 'success' : 'danger'} dot>
      {t(`status.${status}`)}
    </Badge>
  );
}

/** The product lines of an invoice — on screen, in the review step and on paper. */
export function InvoiceLines({ rows }: { rows: InvoiceRow[] }) {
  const { t, i18n } = useTranslation('orders');
  const lang = i18n.language;
  return (
    <div className="inv-lines-wrap">
      <table className="inv-lines">
        <thead>
          <tr>
            <th>{t('invoice.designation')}</th>
            <th className="num">{t('invoice.qty')}</th>
            <th className="num">{t('invoice.unitPrice')}</th>
            <th className="num">{t('invoice.totalHt')}</th>
            <th className="num">{t('invoice.tvaRate')}</th>
            <th className="num">{t('invoice.tvaAmount')}</th>
            <th className="num">{t('invoice.totalTtc')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                <span className="inv-product">{r.name}</span>
                <span className="inv-sku">
                  {t('invoice.sku')} {r.sku}
                </span>
              </td>
              <td className="num">{r.quantity}</td>
              <td className="num">{formatMoney(r.unitPrice, lang)}</td>
              <td className="num">{formatMoney(r.ht, lang)}</td>
              <td className="num">{formatRate(r.tvaRate)}</td>
              <td className="num">{formatMoney(r.tva, lang)}</td>
              <td className="num strong">{formatMoney(r.ttc, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceTotals({ ht, tva, ttc }: { ht: number | string; tva: number | string; ttc: number | string }) {
  const { t, i18n } = useTranslation('orders');
  return (
    <dl className="inv-totals">
      <div>
        <dt>{t('totals.ht')}</dt>
        <dd>{formatMoney(ht, i18n.language)}</dd>
      </div>
      <div>
        <dt>{t('totals.tva')}</dt>
        <dd>{formatMoney(tva, i18n.language)}</dd>
      </div>
      <div className="is-grand">
        <dt>{t('totals.ttc')}</dt>
        <dd>{formatMoney(ttc, i18n.language)}</dd>
      </div>
    </dl>
  );
}

function StoreBlock({ store }: { store: StoreSnapshot }) {
  const cityLine = [store.postal_code, store.city].filter(Boolean).join(' ');
  return (
    <address className="inv-party-body">
      <strong>{store.name}</strong>
      {store.brand && <span>{store.brand}</span>}
      {store.address && <span>{store.address}</span>}
      {cityLine && <span>{cityLine}</span>}
      {store.region && <span>{store.region}</span>}
    </address>
  );
}

/** The invoice of one order, laid out as a printable document. */
export default function InvoiceDocument({ order }: { order: Order }) {
  const { t, i18n } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const lang = i18n.language;
  const invoice = order.invoice;
  const cancelled = order.status === 'cancelled';

  return (
    <article className={`inv-doc ${cancelled ? 'is-cancelled' : ''}`}>
      {cancelled && (
        <div className="inv-stamp" aria-hidden="true">
          {t('invoice.cancelledStamp')}
        </div>
      )}

      <header className="inv-head">
        <div className="inv-issuer">
          <span className="inv-brand">{tCommon('appName')}</span>
        </div>
        <div className="inv-meta">
          <h2 className="inv-title">{t('invoice.title')}</h2>
          <dl>
            <div>
              <dt>{t('invoice.number')}</dt>
              <dd>{invoice?.number ?? '—'}</dd>
            </div>
            <div>
              <dt>{t('invoice.date')}</dt>
              <dd>{formatDateOnly(invoice?.issued_at ?? order.created_at, lang)}</dd>
            </div>
            <div>
              <dt>{t('invoice.orderNumber')}</dt>
              <dd>{order.number}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="inv-parties">
        <div className="inv-party">
          <span className="inv-party-label">{t('invoice.billedTo')}</span>
          {invoice ? <StoreBlock store={invoice.store_snapshot} /> : <span>{order.store?.name ?? '—'}</span>}
        </div>
        {order.created_by && (
          <div className="inv-party">
            <span className="inv-party-label">{t('invoice.placedBy')}</span>
            <div className="inv-party-body">
              <strong>{order.created_by.full_name}</strong>
              <span>{formatDate(order.created_at, lang)}</span>
            </div>
          </div>
        )}
      </section>

      <InvoiceLines
        rows={order.items.map((i) => ({
          key: i.id,
          name: i.product_name,
          sku: i.product_sku,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          tvaRate: i.tva_rate,
          ht: i.total_ht,
          tva: i.tva_amount,
          ttc: i.total_ttc,
        }))}
      />

      <div className="inv-foot">
        <div className="inv-notes">
          {order.notes && (
            <>
              <span className="inv-party-label">{t('invoice.notes')}</span>
              <p>{order.notes}</p>
            </>
          )}
          {cancelled && (
            <p className="inv-cancel-note">
              {t('invoice.cancelledOn', {
                date: order.cancelled_at ? formatDate(order.cancelled_at, lang) : '—',
                name: order.cancelled_by?.full_name ?? '—',
              })}
              {order.cancel_reason && (
                <>
                  <br />
                  {t('invoice.reason', { reason: order.cancel_reason })}
                </>
              )}
            </p>
          )}
        </div>
        <InvoiceTotals ht={order.total_ht} tva={order.total_tva} ttc={order.total_ttc} />
      </div>
    </article>
  );
}
