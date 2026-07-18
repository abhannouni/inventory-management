import { api } from './client';

export interface FeatureFlag {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export const settingsApi = {
  findAllFlags: () => api.get<FeatureFlag[]>('/settings/feature-flags'),
  setFlag: (key: string, enabled: boolean) =>
    api.patch<FeatureFlag>(`/settings/feature-flags/${key}`, { enabled }),
  getFlagStatus: (key: string) =>
    api.get<{ key: string; enabled: boolean }>(`/settings/feature-flags/${key}/status`),
};
