import { useTranslation } from 'react-i18next';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { directionsLink } from '../../utils/maps';
import type { Store } from '../../types';

interface PosPreviewCardProps {
  store: Store;
  onClose: () => void;
  onViewDetails: () => void;
}

/**
 * The small preview shown when a POS marker is clicked: the key facts plus a
 * View Details action. A floating React card (not a Mapbox popup) so the button
 * can drive the router directly.
 */
export default function PosPreviewCard({ store, onClose, onViewDetails }: PosPreviewCardProps) {
  const { t } = useTranslation('pos');
  const { t: tStores } = useTranslation('stores');
  const directions = directionsLink(store);

  return (
    <div className="pos-preview" role="dialog" aria-label={store.name}>
      <button type="button" className="pos-preview-close" onClick={onClose} aria-label={t('preview.close')}>
        ✕
      </button>

      <div className="pos-preview-head">
        <span className="pos-preview-name">{store.name}</span>
        {store.brand && <span className="pos-preview-brand">{store.brand}</span>}
      </div>

      <div className="pos-preview-badges">
        {store.channel && <Badge variant="primary">{tStores(`channel.${store.channel}`)}</Badge>}
        {store.classification && <Badge variant="warning">{store.classification}</Badge>}
        <Badge variant={store.is_active ? 'success' : 'gray'} dot>
          {store.is_active ? t('filters.active') : t('filters.inactive')}
        </Badge>
      </div>

      <div className="pos-preview-addr">
        {[store.address, store.city, store.region?.name].filter(Boolean).join(', ') || '—'}
      </div>

      <div className="pos-preview-actions">
        {directions && (
          <a className="pos-preview-directions" href={directions} target="_blank" rel="noopener noreferrer">
            {tStores('map.directions')}
          </a>
        )}
        <Button size="sm" onClick={onViewDetails}>{t('preview.viewDetails')}</Button>
      </div>
    </div>
  );
}
