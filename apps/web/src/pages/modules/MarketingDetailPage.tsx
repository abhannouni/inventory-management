import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchProductRequest, clearSelected } from '../../store/slices/productRequestsSlice';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';

export default function MarketingDetailPage() {
  const { t, i18n } = useTranslation('productRequests');
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selected: request, loading } = useAppSelector((s) => s.productRequests);

  useEffect(() => {
    if (id) dispatch(fetchProductRequest(id));
    return () => { dispatch(clearSelected()); };
  }, [id, dispatch]);

  if (loading && !request) return <Spinner center size="lg" />;
  if (!request) return <div className="empty-state"><p>{t('detail.notFound')}</p></div>;

  return (
    <div>
      <PageHeader
        title={t('detail.title')}
        subtitle={`${request.store?.name || request.store_id} — ${request.sous_famille}`}
        actions={<Button variant="ghost" onClick={() => navigate(-1)}>← {t('detail.back')}</Button>}
      />

      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }} style={{ marginBottom: 20 }}>
        <div className="card-body">
          <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 16 }}>{t('detail.info.title')}</h3>
          <div className="visit-detail-grid">
            <div className="detail-item">
              <span className="detail-label">{t('detail.info.store')}</span>
              <span className="detail-value">{request.store?.name || request.store_id}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('detail.info.sousFamille')}</span>
              <span className="detail-value">{request.sous_famille}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('detail.info.dimensions')}</span>
              <span className="detail-value">{request.width} × {request.height} × {request.depth} cm</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('detail.info.requestedBy')}</span>
              <span className="detail-value">{request.created_by?.full_name || '—'}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">{t('detail.info.date')}</span>
              <span className="detail-value">{formatDate(request.created_at, i18n.language)}</span>
            </div>
            {request.store?.region && (
              <div className="detail-item">
                <span className="detail-label">{t('detail.info.region')}</span>
                <span className="detail-value">{request.store.region.name}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <motion.div className="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="card-header" style={{ padding: '16px 20px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{t('detail.photos.title', { count: request.image_urls.length })}</h3>
        </div>
        <div className="card-body">
          {request.image_urls.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">{t('detail.photos.empty')}</div>
            </div>
          ) : (
            <div className="sf-photo-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
              {request.image_urls.map((url, i) => (
                <a key={`${url}-${i}`} href={url} target="_blank" rel="noopener noreferrer" className="sf-photo-item">
                  <img src={url} alt={t('detail.photos.photoAlt', { index: i + 1 })} />
                </a>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
