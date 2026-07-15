/**
 * Map helpers.
 *
 * The embedded map is rendered by **Mapbox** (see `StoreMap`), using the public
 * token in `VITE_MAPBOX_TOKEN`. The external "open / directions" links stay on
 * Google Maps: Mapbox has no consumer navigation app, and the Google links are
 * keyless and open the map app a merchandiser actually navigates with.
 */

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export interface Coords {
  latitude: number | null;
  longitude: number | null;
}

export function hasCoords(store: Coords): store is { latitude: number; longitude: number } {
  return (
    store.latitude != null &&
    store.longitude != null &&
    !Number.isNaN(Number(store.latitude)) &&
    !Number.isNaN(Number(store.longitude))
  );
}

/**
 * A Mapbox Static Images URL — a plain PNG with a pin, no JS required.
 *
 * Used as the map's no-JavaScript / loading fallback and anywhere a lightweight
 * thumbnail is enough. `@2x` keeps it crisp on retina screens.
 */
export function mapboxStaticImage(
  store: Coords,
  { width = 640, height = 320, zoom = 15 } = {},
): string | null {
  if (!hasCoords(store) || !MAPBOX_TOKEN) return null;
  const lng = Number(store.longitude);
  const lat = Number(store.latitude);
  const marker = `pin-l+2b6cb0(${lng},${lat})`;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/` +
    `${marker}/${lng},${lat},${zoom}/${width}x${height}@2x` +
    `?access_token=${MAPBOX_TOKEN}`
  );
}

/** The URL that opens the location in the Google Maps app or site (keyless). */
export function externalMapLink(
  store: Coords & { google_maps_url?: string | null },
): string | null {
  // An explicit link wins: a pasted link may point at the exact storefront
  // entrance rather than the rooftop coordinate.
  if (store.google_maps_url) return store.google_maps_url;
  if (!hasCoords(store)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
}

/** Turn-by-turn directions — what a merchandiser actually wants on a phone. */
export function directionsLink(store: Coords): string | null {
  if (!hasCoords(store)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
}

/**
 * Pull coordinates out of a pasted map URL (Google or Mapbox).
 *
 * Handles the shapes people actually paste:
 *   .../@33.5731,-7.5898,17z          → the map centre
 *   ...?q=33.5731,-7.5898             → an explicit query
 *   .../place/Name/@33.57,-7.58,17z/  → a place page
 *   ...#12/33.57/-7.58                → a Mapbox-style hash (lat/lng order)
 *
 * Short links (maps.app.goo.gl/…) carry no coordinates until they are followed,
 * which the browser cannot do cross-origin — those are stored as-is instead.
 */
export function parseCoordsFromUrl(url: string): { latitude: number; longitude: number } | null {
  const latLng = (lat: number, lng: number) =>
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
      ? { latitude: lat, longitude: lng }
      : null;

  // lat,lng-ordered patterns
  const latFirst = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /#\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)/, // Mapbox #zoom/lat/lng
  ];
  for (const re of latFirst) {
    const m = url.match(re);
    if (m) {
      const r = latLng(Number(m[1]), Number(m[2]));
      if (r) return r;
    }
  }

  // Google's place marker encodes lng,lat as !3d<lat>!4d<lng>
  const g = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (g) {
    const r = latLng(Number(g[1]), Number(g[2]));
    if (r) return r;
  }

  return null;
}
