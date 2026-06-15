import { api } from './client';
import type { Region } from '../types';

export interface RegionPayload {
  name: string;
}

export const regionsApi = {
  findAll: () => api.get<Region[]>('/regions'),
  findOne: (id: string) => api.get<Region>(`/regions/${id}`),
  create: (payload: RegionPayload) => api.post<Region>('/regions', payload),
  update: (id: string, payload: RegionPayload) => api.patch<Region>(`/regions/${id}`, payload),
  remove: (id: string) => api.delete<Region>(`/regions/${id}`),
};
