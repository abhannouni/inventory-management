import { useEffect, useState } from 'react';
import { settingsApi } from '../api/settings.api';

/**
 * Reads a single feature flag's live state — open to any authenticated user
 * via `/settings/feature-flags/:key/status`, unlike the full flag list which
 * is restricted to super_admin.
 *
 * Returns `fallback` until the request resolves (or if it fails); pick a
 * fallback that fails safe for whatever behavior is being gated.
 */
export function useFeatureFlag(key: string, fallback: boolean): boolean {
  const [enabled, setEnabled] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    settingsApi
      .getFlagStatus(key)
      .then((res) => { if (!cancelled) setEnabled(res.enabled); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [key]);

  return enabled;
}
