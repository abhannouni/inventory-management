import { useEffect, useRef, useState } from 'react';
import type { Map as MapboxMap, Marker } from 'mapbox-gl';
import { useTranslation } from 'react-i18next';
import {
  MAPBOX_TOKEN,
  directionsLink,
  externalMapLink,
  hasCoords,
  mapboxStaticImage,
} from '../../utils/maps';

interface StoreMapProps {
  store: {
    latitude: number | null;
    longitude: number | null;
    google_maps_url?: string | null;
  };
  height?: number;
  /** Name shown in the marker popup / image alt. */
  label?: string;
}

/**
 * Interactive Mapbox map for a point of sale, with links out to Maps.
 *
 * mapbox-gl is pulled in on demand so it never lands in the initial bundle. If
 * the token is missing or WebGL fails, it falls back to a static Mapbox image,
 * so the location is always shown one way or another.
 */
export default function StoreMap({ store, height = 260, label }: StoreMapProps) {
  const { t } = useTranslation('stores');

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [glFailed, setGlFailed] = useState(false);

  const coords = hasCoords(store);
  const lng = coords ? Number(store.longitude) : 0;
  const lat = coords ? Number(store.latitude) : 0;

  const link = externalMapLink(store);
  const directions = directionsLink(store);
  const staticImg = mapboxStaticImage(store, { height });

  // Create the map once, then keep it pointed at the current coordinates.
  useEffect(() => {
    if (!coords || !MAPBOX_TOKEN || glFailed) return;
    let cancelled = false;

    (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;

        if (!mapRef.current) {
          const map = new mapboxgl.Map({
            container: containerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: 15,
            attributionControl: true,
          });
          map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
          map.on('error', (e) => {
            // A WebGL/context failure surfaces here — drop to the static image.
            if (e?.error && /webgl|context/i.test(String(e.error.message))) setGlFailed(true);
          });
          markerRef.current = new mapboxgl.Marker({ color: '#2b6cb0' })
            .setLngLat([lng, lat])
            .addTo(map);
          mapRef.current = map;
        } else {
          mapRef.current.setCenter([lng, lat]);
          markerRef.current?.setLngLat([lng, lat]);
        }
      } catch {
        if (!cancelled) setGlFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when the coordinates change (the form preview updates live).
  }, [coords, lng, lat, glFailed]);

  // Tear the map down only when the component unmounts.
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  if (!coords) {
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
      {glFailed || !MAPBOX_TOKEN ? (
        // Fallback: a static Mapbox image (or a plain message with no token).
        staticImg ? (
          <img
            className="store-map-static"
            src={staticImg}
            style={{ height }}
            alt={label ? t('map.titleFor', { name: label }) : t('map.title')}
            loading="lazy"
          />
        ) : (
          <div className="store-map-empty" style={{ minHeight: height }}>
            <p>{t('map.noToken')}</p>
          </div>
        )
      ) : (
        <div
          ref={containerRef}
          className="store-map-canvas"
          style={{ height }}
          aria-label={label ? t('map.titleFor', { name: label }) : t('map.title')}
        />
      )}

      <div className="store-map-bar">
        <span className="store-map-coords">
          {lat.toFixed(5)}, {lng.toFixed(5)}
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
