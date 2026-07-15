import { useEffect, useRef } from 'react';
import type { GeoJSONSource, Map as MapboxMap } from 'mapbox-gl';
import type { FeatureCollection, Point } from 'geojson';
import { MAPBOX_TOKEN, hasCoords } from '../../utils/maps';
import type { Store } from '../../types';

interface PosMapProps {
  stores: Store[];
  selectedId?: string | null;
  onSelect: (store: Store) => void;
  height?: number | string;
}

/** GeoJSON of the mappable POS — the source the clustering layers read from. */
function toGeoJson(stores: Store[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stores.filter(hasCoords).map((s) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(s.longitude), Number(s.latitude)] },
      properties: { id: s.id, name: s.name, active: s.is_active ? 1 : 0 },
    })),
  };
}

const SOURCE = 'pos';

/**
 * Interactive, clustering map of the authorized points of sale.
 *
 * Uses Mapbox's built-in GeoJSON clustering (no extra library): nearby POS
 * collapse into a count bubble that expands on click, and single POS are tappable
 * markers. mapbox-gl is loaded on demand so it stays out of the initial bundle.
 */
export default function PosMap({ stores, selectedId, onSelect, height = 520 }: PosMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const readyRef = useRef(false);
  // Keep the latest handler/stores available to the map's event callbacks without
  // re-running the heavy init effect. Synced in an effect (never during render).
  const onSelectRef = useRef(onSelect);
  const storesRef = useRef(stores);
  useEffect(() => {
    onSelectRef.current = onSelect;
    storesRef.current = stores;
  });

  // Fit the view to whatever POS are currently shown.
  const fitToStores = (map: MapboxMap, list: Store[]) => {
    const pts = list.filter(hasCoords);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.easeTo({ center: [Number(pts[0].longitude), Number(pts[0].latitude)], zoom: 14 });
      return;
    }
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    for (const s of pts) {
      const lng = Number(s.longitude);
      const lat = Number(s.latitude);
      minLng = Math.min(minLng, lng); maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 60, maxZoom: 15, duration: 500 },
    );
  };

  // Build the map once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [-7.5898, 33.5731],
        zoom: 4,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
      map.addControl(new mapboxgl.GeolocateControl({ trackUserLocation: false }), 'top-right');
      mapRef.current = map;

      map.on('load', () => {
        map.addSource(SOURCE, {
          type: 'geojson',
          data: toGeoJson(storesRef.current),
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        // Cluster bubbles — grow with the count.
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: SOURCE,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#1D6ADE',
            'circle-opacity': 0.85,
            'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 50, 30],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: SOURCE,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 13,
          },
          paint: { 'text-color': '#ffffff' },
        });

        // Single POS — coloured by status.
        map.addLayer({
          id: 'pos-point',
          type: 'circle',
          source: SOURCE,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': ['case', ['==', ['get', 'active'], 1], '#1D6ADE', '#9CA3AF'],
            'circle-radius': 8,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });

        readyRef.current = true;
        fitToStores(map, storesRef.current);

        // Expand a cluster on click.
        map.on('click', 'clusters', (e) => {
          const feature = map.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
          const clusterId = feature.properties?.cluster_id;
          const src = map.getSource(SOURCE) as GeoJSONSource;
          src.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (err) return;
            map.easeTo({
              center: (feature.geometry as Point).coordinates as [number, number],
              zoom: zoom ?? map.getZoom() + 2,
            });
          });
        });

        // Select a POS on click.
        map.on('click', 'pos-point', (e) => {
          const id = e.features?.[0]?.properties?.id as string | undefined;
          const store = storesRef.current.find((s) => s.id === id);
          if (store) onSelectRef.current(store);
        });

        for (const layer of ['clusters', 'pos-point']) {
          map.on('mouseenter', layer, () => (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', layer, () => (map.getCanvas().style.cursor = ''));
        }
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  // Push new data + refit whenever the filtered list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource(SOURCE) as GeoJSONSource | undefined;
    if (!src) return;
    src.setData(toGeoJson(stores));
    fitToStores(map, stores);
  }, [stores]);

  // Fly to a POS selected from the list.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedId) return;
    const store = stores.find((s) => s.id === selectedId);
    if (store && hasCoords(store)) {
      map.easeTo({ center: [Number(store.longitude), Number(store.latitude)], zoom: 15 });
    }
  }, [selectedId, stores]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="pos-map-shell pos-map-noken" style={{ height }}>
        Map token not configured — set VITE_MAPBOX_TOKEN.
      </div>
    );
  }

  return <div ref={containerRef} className="pos-map-shell" style={{ height }} />;
}
