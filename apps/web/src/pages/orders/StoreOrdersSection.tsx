import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ordersApi, type OrderListItem } from '../../api/orders.api';
import Spinner from '../../components/ui/Spinner';
import { usePermissions } from '../../hooks/usePermissions';
import { formatDateOnly } from '../../utils/format';
import { OrderStatusBadge } from './InvoiceDocument';
import { formatMoney } from './orderMath';
import './orders.css';

const RECENT = 5;

/**
 * The POS page's order history: its latest orders, a way to place a new one,
 * and a link to the full filtered list. Renders nothing without `orders.read`.
 */
export default function StoreOrdersSection({ storeId, storeActive }: { storeId: string; storeActive: boolean }) {
  const { t, i18n } = useTranslation('orders');
  const { can } = usePermissions();
  const canRead = can('orders.read');
  const [data, setData] = useState<{ storeId: string; items: OrderListItem[]; total: number } | null>(null);

  useEffect(() => {
    if (!canRead) return;
    let current = true;
    ordersApi
      .list({ store_id: storeId, limit: RECENT })
      .then((res) => current && setData({ storeId, items: res.items, total: res.meta.total }))
      .catch(() => current && setData({ storeId, items: [], total: 0 }));
    return () => {
      current = false;
    };
  }, [canRead, storeId]);

  if (!canRead) return null;
  const loaded = data && data.storeId === storeId ? data : null;

  return (
    <section className="pos-card">
      <div className="ord-section-head">
        <h3 className="pos-card-title" style={{ margin: 0 }}>
          {t('storeSection.title')}
          {loaded && loaded.total > 0 && <span className="ord-muted"> · {t('storeSection.count', { count: loaded.total })}</span>}
        </h3>
        {can('orders.create') && storeActive && (
          <Link to={`/orders/new?store=${storeId}`} className="btn btn-primary btn-sm">
            + {t('placeOrder')}
          </Link>
        )}
      </div>

      {!loaded ? (
        <Spinner center />
      ) : loaded.items.length === 0 ? (
        <p className="ord-muted">{t('storeSection.empty')}</p>
      ) : (
        <>
          <ul className="ord-recent">
            {loaded.items.map((o) => (
              <li key={o.id}>
                <Link to={`/orders/${o.id}`} className="ord-recent-row">
                  <span className="ord-recent-main">
                    <strong>{o.number}</strong>
                    <span className="ord-muted">
                      {formatDateOnly(o.created_at, i18n.language)}
                      {o.invoice && ` · ${o.invoice.number}`}
                    </span>
                  </span>
                  <OrderStatusBadge status={o.status} />
                  <strong className="ord-num">{formatMoney(o.total_ttc, i18n.language)}</strong>
                </Link>
              </li>
            ))}
          </ul>
          {loaded.total > RECENT && (
            <Link to={`/orders?store=${storeId}`} className="ord-link">
              {t('storeSection.viewAll')} ›
            </Link>
          )}
        </>
      )}
    </section>
  );
}
