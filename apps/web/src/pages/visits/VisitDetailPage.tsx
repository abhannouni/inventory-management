import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchVisit } from '../../store/slices/visitsSlice';
import { fetchAuditItems } from '../../store/slices/auditItemsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import VisitTimer from '../../components/ui/VisitTimer';
import { formatDate, formatDurationShort } from '../../utils/format';
import type { AuditStatus } from '../../types';

const statusBadge: Record<AuditStatus, 'success' | 'warning' | 'danger' | 'primary'> = {
  in_stock: 'primary',
  stock_disponible: 'success',
  low_stock: 'warning',
  out_of_stock: 'danger',
};

export default function VisitDetailPage() {
  const { t, i18n } = useTranslation('visits');
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selected: visit, loading } = useAppSelector((s) => s.visits);
  const { items: auditItems } = useAppSelector((s) => s.auditItems);

  const statusLabel: Record<AuditStatus, string> = {
    in_stock: tCommon('status.in_stock'),
    stock_disponible: tCommon('status.stock_disponible'),
    low_stock: tCommon('status.low_stock'),
    out_of_stock: tCommon('status.out_of_stock'),
  };

  useEffect(() => {
    if (id) {
      dispatch(fetchVisit(id));
      dispatch(fetchAuditItems({ visit_id: id }));
    }
  }, [id, dispatch]);

  if (loading) return <Spinner center size="lg" />;
  if (!visit) return <div className="empty-state"><p>{t('detail.notFound')}</p></div>;

  const reportCards = visit.report_cards ?? [];
  const hasReport = reportCards.length > 0 || !!visit.report_title;

  const items = visit.audit_items || auditItems;
  const total = items.length;
  const inStock = items.filter((i) => i.status === 'in_stock').length;
  const stockDisponible = items.filter((i) => i.status === 'stock_disponible').length;
  const lowStock = items.filter((i) => i.status === 'low_stock').length;
  const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;

  return (
    <div>
      <PageHeader
        title={t('detail.title')}
        subtitle={`${visit.store?.name || t('detail.subtitleFallbackStore')} — ${formatDate(visit.checkin_at, i18n.language)}`}
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>← {t('detail.back')}</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <div className="card-body">
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 16 }}>{t('detail.visitInfo.title')}</h3>
            <div className="visit-detail-grid">
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.store')}</span>
                <span className="detail-value">{visit.store?.name}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.status')}</span>
                <Badge variant={visit.status === 'open' ? 'success' : 'gray'} dot>
                  {visit.status === 'open' ? tCommon('status.open') : tCommon('status.closed')}
                </Badge>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.checkin')}</span>
                <span className="detail-value">{formatDate(visit.checkin_at, i18n.language)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.checkout')}</span>
                <span className="detail-value">{visit.checkout_at ? formatDate(visit.checkout_at, i18n.language) : '—'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.duration')}</span>
                {visit.status === 'open'
                  ? <VisitTimer visit={visit} variant="inline" />
                  : <span className="detail-value">{formatDurationShort(visit.duration_seconds)}</span>}
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('detail.visitInfo.gpsIn')}</span>
                <span className="gps-coords">{Number(visit.checkin_lat).toFixed(5)}, {Number(visit.checkin_lng).toFixed(5)}</span>
              </div>
              {visit.checkout_lat && (
                <div className="detail-item">
                  <span className="detail-label">{t('detail.visitInfo.gpsOut')}</span>
                  <span className="gps-coords">{Number(visit.checkout_lat).toFixed(5)}, {Number(visit.checkout_lng).toFixed(5)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {reportCards.length > 0 ? (
          <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-body">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>{t('detail.report.title')}</h3>
              <div className="detail-item">
                <span className="detail-label">{t('detail.report.cardsCount')}</span>
                <span className="detail-value">{reportCards.length}</span>
              </div>
            </div>
          </motion.div>
        ) : visit.report_title ? (
          <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-body">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>{t('detail.report.title')}</h3>
              <div className="detail-item" style={{ marginBottom: 12 }}>
                <span className="detail-label">{t('detail.report.titleLabel')}</span>
                <span className="detail-value">{visit.report_title}</span>
              </div>
              {visit.report_note && (
                <div className="detail-item">
                  <span className="detail-label">{t('detail.report.noteLabel')}</span>
                  <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{visit.report_note}</span>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="card-body">
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 12 }}>{t('detail.auditSummary.title')}</h3>
              <div className="summary-grid" style={{ background: 'transparent', padding: 0, gap: 16 }}>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: 'var(--gray-900)' }}>{total}</div>
                  <div className="summary-label">{t('detail.auditSummary.total')}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: 'var(--primary)' }}>{inStock}</div>
                  <div className="summary-label">{t('detail.auditSummary.inStock')}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: 'var(--success)' }}>{stockDisponible}</div>
                  <div className="summary-label">{t('detail.auditSummary.stockDisponible')}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: 'var(--warning)' }}>{lowStock}</div>
                  <div className="summary-label">{t('detail.auditSummary.lowStock')}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-value" style={{ color: 'var(--danger)' }}>{outOfStock}</div>
                  <div className="summary-label">{t('detail.auditSummary.outOfStock')}</div>
                </div>
              </div>
              {total > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>
                    <span>{t('detail.auditSummary.completion')}</span>
                    <span>{Math.round((inStock / total) * 100)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${(inStock / total) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {!hasReport && (visit.initial_photos.length > 0 || visit.final_photos.length > 0) && (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginBottom: 20 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t('detail.beforeAfter.title')}</h3>
          </div>
          <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>{t('detail.beforeAfter.initialLabel')}</h4>
              {visit.initial_note && <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{visit.initial_note}</p>}
              {visit.initial_photos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>{t('detail.beforeAfter.noPhotos')}</p>
              ) : (
                <div className="sf-photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                  {visit.initial_photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="sf-photo-item">
                      <img src={url} alt={t('detail.beforeAfter.photoAlt')} />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 8 }}>{t('detail.beforeAfter.finalLabel')}</h4>
              {visit.final_note && <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 8, whiteSpace: 'pre-wrap' }}>{visit.final_note}</p>}
              {visit.final_photos.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>{t('detail.beforeAfter.noPhotos')}</p>
              ) : (
                <div className="sf-photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
                  {visit.final_photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="sf-photo-item">
                      <img src={url} alt={t('detail.beforeAfter.photoAlt')} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {reportCards.length > 0 ? (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t('detail.report.cardsTitle', { count: reportCards.length })}</h3>
          </div>
          <div className="card-body">
            {reportCards.map((card, idx) => (
              <div key={card.id} className="sf-report-card" style={idx === reportCards.length - 1 ? { marginBottom: 0 } : undefined}>
                <div className="sf-report-card-header">
                  <span className="sf-report-card-title">{t('supervisorFlow.report.cardTitle')} {idx + 1}</span>
                  <span className="sf-category-option selected" style={{ flex: 'none', cursor: 'default' }}>
                    {t(`supervisorFlow.report.categoryOptions.${card.category}`)}
                  </span>
                </div>
                {card.note && (
                  <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 12, whiteSpace: 'pre-wrap' }}>{card.note}</p>
                )}
                <div className="sf-photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {card.photos.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="sf-photo-item">
                      <img src={url} alt={t('detail.report.photoAlt')} />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ) : visit.report_title ? (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t('detail.report.photosTitle', { count: visit.report_photos.length })}</h3>
          </div>
          <div className="card-body">
            {visit.report_photos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">{t('detail.report.noPhotos')}</div>
              </div>
            ) : (
              <div className="sf-photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {visit.report_photos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="sf-photo-item">
                    <img src={url} alt={t('detail.report.photoAlt')} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="card-header" style={{ padding: '16px 20px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t('detail.auditItems.title', { count: total })}</h3>
          </div>
          {items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">{t('detail.auditItems.emptyTitle')}</div>
              <div className="empty-state-subtitle">{t('detail.auditItems.emptySubtitle')}</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('detail.auditItems.columns.product')}</th>
                  <th>{t('detail.auditItems.columns.sku')}</th>
                  <th>{t('detail.auditItems.columns.qtyFound')}</th>
                  <th>{t('detail.auditItems.columns.status')}</th>
                  <th>{t('detail.auditItems.columns.notes')}</th>
                  <th>{t('detail.auditItems.columns.photo')}</th>
                  <th>{t('detail.auditItems.columns.promo')}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 500 }}>{item.product?.name || item.product_id}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.product?.sku || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{item.qty_found}</td>
                    <td><Badge variant={statusBadge[item.status]}>{statusLabel[item.status]}</Badge></td>
                    <td style={{ color: 'var(--gray-500)' }}>{item.notes || '—'}</td>
                    <td>
                      {item.photo_url ? (
                        <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                          <img src={item.photo_url} alt={t('detail.auditItems.photoAlt')} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--gray-200)' }} />
                        </a>
                      ) : '—'}
                    </td>
                    <td>{item.has_promo ? <span className="mf-promo-badge" style={{ marginLeft: 0 }}>{t('merchandiserFlow.audit.promoLabel')}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}
    </div>
  );
}
