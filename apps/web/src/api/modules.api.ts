import { api } from './client';

/** Shared response shape for modules that are permission-gated but not built yet. */
export interface ModuleStatus {
  available: boolean;
  message: string;
}

export const modulesApi = {
  sellOut: () => api.get<ModuleStatus>('/sell-out'),
  training: () => api.get<ModuleStatus>('/training'),
  hr: () => api.get<ModuleStatus>('/hr'),
  priceSurveys: () => api.get<ModuleStatus>('/price-surveys'),
};
