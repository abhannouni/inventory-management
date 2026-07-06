import { api } from './client';
import type { Visit } from '../types';

export interface CheckinPayload {
  store_id: string;
  schedule_id?: string;
  lat: number;
  lng: number;
  checkin_at?: string;
}

export interface CheckoutPayload {
  visit_id: string;
  lat: number;
  lng: number;
  checkout_at?: string;
}

export interface FindVisitsParams {
  store_id?: string;
  status?: string;
  [key: string]: string | undefined;
}

export const visitsApi = {
  checkin: (payload: CheckinPayload) => api.post<Visit>('/visits/checkin', payload),
  checkout: (payload: CheckoutPayload) => api.post<Visit>('/visits/checkout', payload),
  findAll: (params?: FindVisitsParams) => api.get<Visit[]>('/visits', params),
  findOne: (id: string) => api.get<Visit>(`/visits/${id}`),
};
