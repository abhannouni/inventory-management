import { useTranslation } from 'react-i18next';
import {
  googleMapsDirections,
  googleMapsEmbed,
  googleMapsLink,
  hasCoords,
} from '../../utils/maps';

interface StoreMapProps {
  store: {
    latitude: number | null;
    longitude: number | null;
    google_maps_url?: string | null;
  };
  height?: number;
  /** Name shown above the map. */
  label?: string;
}

/**
 * Embedded Google map for a point of sale, with links out to Maps.
 *
 * The iframe is lazy-loaded and keyless by default (see `utils/maps`), so it
 * works with no configuration; setting VITE_GOOGLE_MAPS_API_KEY upgrades it to
 * the official Embed API.
 */
export default function StoreMap({ store, height = 260, label }: StoreMapProps) {
  const { t } = useTranslation('stores');

  const embed = googleMapsEmbed(store);
  const link = googleMapsLink(store);
  const directions = googleMapsDirections(store);

  if (!hasCoords(store)) {
    return (
      <div className="store-map store-map-empty" style={{ minHeight: height }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
        <p>{t('map.noCoords')}</p>
      </div>
    );
  }

  return (
    <div className="store-map">
      <iframe
        title={label ? t('map.titleFor', { name: label }) : t('map.title')}
        src={embed!}
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />

      <div className="store-map-bar">
        <span className="store-map-coords">
          {Number(store.latitude).toFixed(5)}, {Number(store.longitude).toFixed(5)}
        </span>

        <div className="store-map-links">
          {directions && (
            <a className="store-map-link" href={directions} target="_blank" rel="noopener noreferrer">
              {t('map.directions')}
            </a>
          )}
          {link && (
            <a
              className="store-map-link is-primary"
              href={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('map.openInGoogleMaps')}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
