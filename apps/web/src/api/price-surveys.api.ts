import { api } from './client';
import type { PriceSurveyAssignment, PriceSurveyNoteSide, PriceSurveySubmission } from '../types';

export interface SaveItemPayload {
  id: string;
  price_normal?: number | null;
  price_promo?: number | null;
  etat?: string | null;
  competitor_name?: string | null;
  competitor_cl?: string | null;
  competitor_price_normal?: number | null;
  competitor_price_promo?: number | null;
  competitor_etat?: string | null;
}

export interface SaveNotePayload {
  section: string;
  sub_area: string;
  side: PriceSurveyNoteSide;
  text?: string | null;
}

export interface SaveSubmissionPayload {
  items: SaveItemPayload[];
  notes: SaveNotePayload[];
}

export interface FindSubmissionsParams {
  user_id?: string;
  store_id?: string;
  from?: string;
  to?: string;
  [key: string]: string | undefined;
}

export const priceSurveysApi = {
  getDraft: (storeId: string, userId?: string) =>
    api.get<PriceSurveySubmission>('/price-surveys/draft', { store_id: storeId, user_id: userId }),
  saveSubmission: (id: string, payload: SaveSubmissionPayload) =>
    api.patch<PriceSurveySubmission>(`/price-surveys/submissions/${id}`, payload),
  newRound: (id: string) => api.post<PriceSurveySubmission>(`/price-surveys/submissions/${id}/new-round`),
  listSubmissions: (params?: FindSubmissionsParams) =>
    api.get<PriceSurveySubmission[]>('/price-surveys/submissions', params),
  getSubmission: (id: string) => api.get<PriceSurveySubmission>(`/price-surveys/submissions/${id}`),
  getAssignments: (userId: string, storeId: string) =>
    api.get<PriceSurveyAssignment[]>('/price-surveys/assignments', { user_id: userId, store_id: storeId }),
  setAssignments: (payload: { user_id: string; store_id: string; product_ids: string[] }) =>
    api.put<PriceSurveyAssignment[]>('/price-surveys/assignments', payload),
};
