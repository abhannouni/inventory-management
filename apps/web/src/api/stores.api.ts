import { api } from './client';
import type { Store } from '../types';

export interface StorePayload {
  name: string;
  address: string;
  lat: number;
  lng: number;
  region_id: string;
}

export const storesApi = {
  findAll: () => api.get<Store[]>('/stores'),
  findOne: (id: string) => api.get<Store>(`/stores/${id}`),
  create: (payload: StorePayload) => api.post<Store>('/stores', payload),
  update: (id: string, payload: Partial<StorePayload>) => api.patch<Store>(`/stores/${id}`, payload),
  remove: (id: string) => api.delete<Store>(`/stores/${id}`),
};
