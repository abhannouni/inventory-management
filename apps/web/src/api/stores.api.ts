import { api } from './client';
import type { Store, StoreChannel, StoreClassification } from '../types';

export interface StorePayload {
  name: string;
  region_id: string;

  // General information
  brand?: string;
  channel?: StoreChannel | '';
  classification?: StoreClassification | '';

  // Address
  address?: string;
  city?: string;
  postal_code?: string;
  /** ISO date, YYYY-MM-DD. */
  opening_date?: string;

  // Contacts
  section_manager_name?: string;
  section_manager_phone?: string;
  department_manager_name?: string;
  department_manager_phone?: string;
  gds_name?: string;
  gds_phone?: string;

  // Geolocation
  latitude?: number;
  longitude?: number;
  google_maps_url?: string;

  is_active?: boolean;
  visible_to_gm?: boolean;
}

export const storesApi = {
  findAll: () => api.get<Store[]>('/stores'),
  findOne: (id: string) => api.get<Store>(`/stores/${id}`),
  create: (payload: StorePayload) => api.post<Store>('/stores', payload),
  update: (id: string, payload: Partial<StorePayload>) =>
    api.patch<Store>(`/stores/${id}`, payload),
  remove: (id: string) => api.delete<Store>(`/stores/${id}`),
};
