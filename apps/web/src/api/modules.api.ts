import { api } from './client';

/** Shared response shape for modules that are permission-gated but not built yet. */
export interface ModuleStatus {
  available: boolean;
  message: string;
}

export const modulesApi = {
  sellOut: () => api.get<ModuleStatus>('/sell-out'),
  merchandising: () => api.get<ModuleStatus>('/merchandising'),
  marketing: () => api.get<ModuleStatus>('/marketing'),
  hr: () => api.get<ModuleStatus>('/hr'),
};
