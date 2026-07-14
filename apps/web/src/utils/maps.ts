/**
 * Google Maps helpers.
 *
 * Everything here works with **no API key**: the `maps.google.com/maps?...&output=embed`
 * iframe and the `google.com/maps/search/?api=1` link are both public endpoints.
 * If a key is configured in `VITE_GOOGLE_MAPS_API_KEY`, the embed upgrades to the
 * official Maps Embed API (nicer controls, no "for development" watermark) — but
 * the module degrades gracefully without one, so the map works out of the box.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

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

/** The URL that opens the location in the Google Maps app or site. */
export function googleMapsLink(store: Coords & { google_maps_url?: string | null }): string | null {
  // An explicit link wins: a short goo.gl link may point at the exact storefront
  // entrance rather than the rooftop coordinate.
  if (store.google_maps_url) return store.google_maps_url;
  if (!hasCoords(store)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`;
}

/** The src for an embedded map iframe, or null when there is nothing to show. */
export function googleMapsEmbed(store: Coords, zoom = 16): string | null {
  if (!hasCoords(store)) return null;
  const q = `${store.latitude},${store.longitude}`;

  // Point at www.google.com directly: maps.google.com 301-redirects there, and a
  // redirect inside an iframe is a wasted round-trip on every render.
  return API_KEY
    ? `https://www.google.com/maps/embed/v1/place?key=${API_KEY}&q=${q}&zoom=${zoom}`
    : `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`;
}

/** The directions URL — what a merchandiser actually wants on a phone. */
export function googleMapsDirections(store: Coords): string | null {
  if (!hasCoords(store)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
}

/**
 * Pull coordinates out of a pasted Google Maps URL.
 *
 * Handles the three shapes people actually paste:
 *   .../@33.5731,-7.5898,17z          → the map centre
 *   ...?q=33.5731,-7.5898              → an explicit query
 *   .../place/Name/@33.57,-7.58,17z/   → a place page
 *
 * Short links (maps.app.goo.gl/…) carry no coordinates until they are followed,
 * which the browser cannot do cross-origin — those are stored as-is instead.
 */
export function parseCoordsFromUrl(url: string): { latitude: number; longitude: number } | null {
  const patterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/, // /@lat,lng,17z
    /[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // ?q=lat,lng
    /[?&]query=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/, // ?query=lat,lng
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/, // !3dlat!4dlng
  ];

  for (const re of patterns) {
    const m = url.match(re);
    if (!m) continue;

    const latitude = Number(m[1]);
    const longitude = Number(m[2]);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      Math.abs(latitude) <= 90 &&
      Math.abs(longitude) <= 180
    ) {
      return { latitude, longitude };
    }
  }
  return null;
}
