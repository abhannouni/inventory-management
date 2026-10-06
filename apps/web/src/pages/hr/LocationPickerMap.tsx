import { useEffect, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapboxMap, Marker } from 'mapbox-gl';
import { useTranslation } from 'react-i18next';
import { MAPBOX_TOKEN } from '../../utils/maps';

interface Props {
  /** Current pin, or null when no position is chosen yet. */
  lat: number | null;
  lng: number | null;
  /** Drawn as a circle around the pin — the area that counts as "at" this place. */
  radiusMeters: number;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

/** Casablanca — where the map opens when nothing is picked yet. */
const DEFAULT_CENTER: [number, number] = [-7.5898, 33.5731];
const CIRCLE_SOURCE = 'picker-radius';

/** A ~64-point polygon approximating a circle of `meters` around [lng, lat]. */
function circle(lng: number, lat: number, meters: number): GeoJSON.Feature<GeoJSON.Polygon> {
  const points = 64;
  const dLat = meters / 111_320;
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * 2 * Math.PI;
    ring.push([lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}

const round7 = (n: number) => Math.round(n * 1e7) / 1e7;

/**
 * Pick a place on a map: click to drop the pin, drag it to adjust, or search
 * an address. Mapbox is loaded on demand, like the POS map; with no token or
 * no WebGL it says so and the latitude/longitude fields still work.
 */
export default function LocationPickerMap({ lat, lng, radiusMeters, onChange, height = 280 }: Props) {
  const { t } = useTranslation('hr');
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const hasPin = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  // Create the map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        if (cancelled || !containerRef.current) return;
        mapboxgl.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: hasPin ? [lng!, lat!] : DEFAULT_CENTER,
          zoom: hasPin ? 16 : 11,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
        map.getCanvas().style.cursor = 'crosshair';
        map.on('error', (e) => {
          if (e?.error && /webgl|context/i.test(String(e.error.message))) setFailed(true);
        });

        const marker = new mapboxgl.Marker({ color: '#2b6cb0', draggable: true });
        marker.on('dragend', () => {
          const p = marker.getLngLat();
          onChangeRef.current(round7(p.lat), round7(p.lng));
        });
        markerRef.current = marker;

        map.on('click', (e) => onChangeRef.current(round7(e.lngLat.lat), round7(e.lngLat.lng)));
        map.on('load', () => {
          map.addSource(CIRCLE_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          map.addLayer({
            id: `${CIRCLE_SOURCE}-fill`,
            type: 'fill',
            source: CIRCLE_SOURCE,
            paint: { 'fill-color': '#2b6cb0', 'fill-opacity': 0.12 },
          });
          map.addLayer({
            id: `${CIRCLE_SOURCE}-line`,
            type: 'line',
            source: CIRCLE_SOURCE,
            paint: { 'line-color': '#2b6cb0', 'line-width': 1.5 },
          });
          if (!cancelled) setReady(true);
        });
        mapRef.current = map;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // The map is created once; later pin changes are applied by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin and the radius circle in step with the form.
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!ready || !map || !marker) return;
    const source = map.getSource(CIRCLE_SOURCE) as GeoJSONSource | undefined;
    if (!hasPin) {
      marker.remove();
      source?.setData({ type: 'FeatureCollection', features: [] });
      return;
    }
    marker.setLngLat([lng!, lat!]).addTo(map);
    source?.setData(circle(lng!, lat!, radiusMeters > 0 ? radiusMeters : 0));
    // Follow the pin when it lands outside the view (typed in, or "my position").
    if (!map.getBounds()?.contains([lng!, lat!])) {
      map.flyTo({ center: [lng!, lat!], zoom: Math.max(map.getZoom(), 15) });
    }
  }, [ready, hasPin, lat, lng, radiusMeters]);

  useEffect(
    () => () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    },
    [],
  );

  const search = async () => {
    const q = query.trim();
    if (!q || !MAPBOX_TOKEN) return;
    setSearching(true);
    setNotFound(false);
    try {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?limit=1&language=fr&country=ma&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = (await res.json()) as { features?: { center: [number, number] }[] };
      const hit = data.features?.[0];
      if (!hit) {
        setNotFound(true);
        return;
      }
      const [hitLng, hitLat] = hit.center;
      mapRef.current?.flyTo({ center: [hitLng, hitLat], zoom: 16 });
      onChange(round7(hitLat), round7(hitLng));
    } catch {
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  };

  if (!MAPBOX_TOKEN || failed) {
    return (
      <div className="store-map store-map-empty" style={{ minHeight: 80 }}>
        <p>{t('locations.map.unavailable')}</p>
      </div>
    );
  }

  return (
    <div className="wh-picker">
      <div className="wh-picker-search">
        <input
          className="form-input"
          value={query}
          placeholder={t('locations.map.searchPlaceholder')}
          onChange={(e) => {
            setQuery(e.target.value);
            setNotFound(false);
          }}
          onKeyDown={(e) => {
            // Inside a form, Enter would otherwise submit it.
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={search} disabled={searching || !query.trim()}>
          {t('locations.map.search')}
        </button>
      </div>
      {notFound && <p className="form-error">{t('locations.map.notFound')}</p>}
      <div className="store-map">
        <div ref={containerRef} className="store-map-canvas" style={{ height }} aria-label={t('locations.map.label')} />
        <div className="store-map-bar">
          <span className="store-map-coords">
            {hasPin ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : t('locations.map.hint')}
          </span>
          {hasPin && <span className="wh-muted">{t('locations.map.dragHint')}</span>}
        </div>
      </div>
    </div>
  );
}
