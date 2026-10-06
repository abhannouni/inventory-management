import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { ordersApi, type Order } from '../../api/orders.api';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageHeader from '../../components/ui/PageHeader';
import Spinner from '../../components/ui/Spinner';
import { usePermissions } from '../../hooks/usePermissions';
import InvoiceDocument, { OrderStatusBadge } from './InvoiceDocument';
import './orders.css';

/**
 * One order, shown as its invoice. Printing uses a print stylesheet that keeps
 * only the invoice; "Download PDF" opens the same print view with the document
 * titled after the invoice number, so "Save as PDF" names the file for you.
 */
export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const { t } = useTranslation('orders');
  const { t: tCommon } = useTranslation('common');
  const { can } = usePermissions();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    ordersApi
      .get(id)
      .then((o) => current && setOrder(o))
      .catch((e: Error) => current && setError(e.message));
    return () => {
      current = false;
    };
  }, [id]);

  const print = (asPdf: boolean) => {
    if (!order) return;
    if (asPdf) toast.info(t('invoice.downloadHint'));
    const previous = document.title;
    document.title = order.invoice?.number ?? order.number;
    const restore = () => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    // Let the toast render before the print dialog blocks the page.
    setTimeout(() => window.print(), asPdf ? 300 : 0);
  };

  const cancel = async () => {
    if (!order) return;
    setBusy(true);
    try {
      setOrder(await ordersApi.cancel(order.id, reason.trim() || undefined));
      toast.success(t('cancel.success'));
      setCancelOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t('invoice.notFound')}</div>
        <Link to="/orders" className="btn btn-ghost">{t('invoice.allOrders')}</Link>
      </div>
    );
  }
  if (!order) return <Spinner center size="lg" />;

  return (
    <div className="ord-detail">
      <div className="no-print">
        <PageHeader
          title={`${t('invoice.title')} ${order.invoice?.number ?? ''}`}
          subtitle={[order.number, order.store?.name].filter(Boolean).join(' · ')}
          actions={
            <div className="ord-actions">
              <Button variant="outline" onClick={() => print(false)}>{t('invoice.print')}</Button>
              <Button onClick={() => print(true)}>{t('invoice.download')}</Button>
            </div>
          }
        />
        <div className="ord-detail-bar">
          <OrderStatusBadge status={order.status} />
          <Link to="/orders" className="ord-link">‹ {t('invoice.allOrders')}</Link>
          {order.store && (
            <Link to={`/pos/${order.store.id}`} className="ord-link">{t('invoice.viewStore')}</Link>
          )}
          {order.status === 'confirmed' && can('orders.update') && (
            <Button size="sm" variant="ghost" className="ord-cancel-btn" onClick={() => setCancelOpen(true)}>
              {t('cancel.button')}
            </Button>
          )}
        </div>
      </div>

      <div className="inv-print-area">
        <InvoiceDocument order={order} />
      </div>

      <Modal open={cancelOpen} onClose={() => !busy && setCancelOpen(false)} title={t('cancel.title', { number: order.number })} size="sm">
        <p className="ord-muted" style={{ marginTop: 0 }}>{t('cancel.message')}</p>
        <div className="form-group">
          <label className="form-label" htmlFor="ord-cancel-reason">{t('cancel.reason')}</label>
          <textarea
            id="ord-cancel-reason"
            className="form-input"
            rows={2}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy}>
            {tCommon('actions.cancel')}
          </Button>
          <Button variant="danger" onClick={cancel} loading={busy}>
            {t('cancel.confirm')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
