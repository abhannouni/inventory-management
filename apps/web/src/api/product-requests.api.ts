import { api } from './client';
import type { ProductRequest } from '../types';

export interface CreateProductRequestPayload {
  store_id: string;
  sous_famille: string;
  width: number;
  height: number;
  depth: number;
  image_urls: string[];
}

export const productRequestsApi = {
  findAll: (params?: { store_id?: string }) => api.get<ProductRequest[]>('/product-requests', params),
  create: (payload: CreateProductRequestPayload) => api.post<ProductRequest>('/product-requests', payload),
  update: (id: string, payload: Partial<CreateProductRequestPayload>) =>
    api.patch<ProductRequest>(`/product-requests/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/product-requests/${id}`),
};
