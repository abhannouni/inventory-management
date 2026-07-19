import { api } from './client';
import type { AuditItem } from '../types';

export interface AuditItemPayload {
  visit_id: string;
  product_id: string;
  qty_found: number;
  notes?: string;
  photo_url?: string;
  has_promo?: boolean;
}

export interface BulkAuditPayload {
  visit_id: string;
  items: Array<{
    product_id: string;
    qty_found: number;
    notes?: string;
    photo_url?: string;
    has_promo?: boolean;
  }>;
}

export const auditItemsApi = {
  findAll: (params?: { visit_id?: string }) => api.get<AuditItem[]>('/audit-items', params),
  findOne: (id: string) => api.get<AuditItem>(`/audit-items/${id}`),
  create: (payload: AuditItemPayload) => api.post<AuditItem>('/audit-items', payload),
  bulkUpsert: (payload: BulkAuditPayload) => api.post<AuditItem[]>('/audit-items/bulk', payload),
  update: (id: string, payload: Partial<AuditItemPayload>) =>
    api.patch<AuditItem>(`/audit-items/${id}`, payload),
  remove: (id: string) => api.delete<AuditItem>(`/audit-items/${id}`),
};
