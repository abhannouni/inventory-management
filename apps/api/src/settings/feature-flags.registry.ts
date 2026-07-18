export interface FeatureFlagDef {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

/**
 * Registered feature flags. Adding one here makes it appear on the Settings
 * page automatically. A flag with no row in the `feature_flags` table falls
 * back to its `default` here — so shipping a new flag never needs a data
 * migration, only a deploy.
 */
export const FEATURE_FLAGS: FeatureFlagDef[] = [
  {
    key: 'visits.gps_required',
    label: 'Require GPS for check-in / check-out',
    description:
      'When enabled, merchandisers and supervisors must be within 2 km of the store to check in or check out of a visit. When disabled, check-in/out works without a location check.',
    default: true,
  },
];
