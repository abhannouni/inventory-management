import type { TFunction } from 'i18next';

export interface GeoPosition {
  lat: number;
  lng: number;
}

export type GeolocationErrorCode = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export class GeolocationError extends Error {
  constructor(public code: GeolocationErrorCode, message: string) {
    super(message);
    this.name = 'GeolocationError';
  }
}

/**
 * Wraps the browser's Geolocation API in a promise. Works the same way on
 * mobile and desktop browsers — both implement `navigator.geolocation`, the
 * only difference is the OS-level permission prompt shown to the user.
 *
 * Laptops without a GPS chip (or with the OS-level location service turned
 * off) routinely fail a high-accuracy request with POSITION_UNAVAILABLE even
 * once the site permission is granted, because there's no GPS fix to give —
 * but they can usually still resolve a coarser Wi-Fi/IP-based position. So on
 * any non-permission failure, retry once with high accuracy off before
 * surfacing an error.
 */
export function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new GeolocationError('unsupported', 'Geolocation is not supported by this browser'));
      return;
    }

    const attempt = (opts: PositionOptions, canRetry: boolean) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            reject(new GeolocationError('denied', err.message));
            return;
          }
          if (canRetry) {
            attempt({ ...opts, enableHighAccuracy: false, timeout: 20000 }, false);
            return;
          }
          if (err.code === err.TIMEOUT) {
            reject(new GeolocationError('timeout', err.message));
          } else {
            reject(new GeolocationError('unavailable', err.message));
          }
        },
        opts,
      );
    };

    const initial = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0, ...options };
    attempt(initial, initial.enableHighAccuracy !== false);
  });
}

/** Maps a `getCurrentPosition` failure to a translated, user-facing message. */
export function geolocationErrorMessage(err: unknown, t: TFunction): string {
  const code: GeolocationErrorCode = err instanceof GeolocationError ? err.code : 'unavailable';
  return t(`geolocation.errors.${code}`);
}
