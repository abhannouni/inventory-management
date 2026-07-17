import { api } from './client';
import type { Visit } from '../types';

// Timestamps are deliberately absent: the server stamps check-in and check-out
// from its own clock and derives the duration from them.
export interface CheckinPayload {
  store_id: string;
  schedule_id?: string;
  lat: number;
  lng: number;
}

export interface CheckoutPayload {
  visit_id: string;
  lat: number;
  lng: number;
}

export interface FindVisitsParams {
  store_id?: string;
  status?: string;
  [key: string]: string | undefined;
}

export interface SubmitReportPayload {
  title: string;
  note?: string;
  photos: string[];
}

export interface SubmitStatePayload {
  note?: string;
  photos: string[];
}

export const visitsApi = {
  checkin: (payload: CheckinPayload) => api.post<Visit>('/visits/checkin', payload),
  checkout: (payload: CheckoutPayload) => api.post<Visit>('/visits/checkout', payload),
  findAll: (params?: FindVisitsParams) => api.get<Visit[]>('/visits', params),
  /** The caller's open visit, or null — the source of truth when resuming the timer. */
  findActive: () => api.get<Visit | null>('/visits/active'),
  findOne: (id: string) => api.get<Visit>(`/visits/${id}`),
  /** Supervisor spot-check: saves title/note/photos on an open visit before checkout. */
  submitReport: (visitId: string, payload: SubmitReportPayload) =>
    api.patch<Visit>(`/visits/${visitId}/report`, payload),
  /** Merchandiser "before" shelf state, saved before the product audit. */
  submitInitialState: (visitId: string, payload: SubmitStatePayload) =>
    api.patch<Visit>(`/visits/${visitId}/initial-state`, payload),
  /** Merchandiser "after" shelf state, saved after the product audit and required before checkout. */
  submitFinalState: (visitId: string, payload: SubmitStatePayload) =>
    api.patch<Visit>(`/visits/${visitId}/final-state`, payload),
};
