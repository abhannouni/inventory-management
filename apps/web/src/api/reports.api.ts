import { api } from './client';
import type { VisitReport, StoreReport, ProductReport } from '../types';

export interface ReportFilters {
  from?: string;
  to?: string;
  store_id?: string;
}

export const reportsApi = {
  visitsReport: (filters?: ReportFilters) =>
    api.get<VisitReport[]>('/reports/visits', filters),

  storeReport: (id: string, filters?: ReportFilters) =>
    api.get<StoreReport>(`/reports/stores/${id}`, filters),

  productReport: (id: string, filters?: ReportFilters) =>
    api.get<ProductReport>(`/reports/products/${id}`, filters),
};
