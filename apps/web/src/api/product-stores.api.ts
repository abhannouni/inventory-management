import { api } from './client';
import type { ProductStore } from '../types';

export interface ProductStorePayload {
  product_id: string;
  store_id: string;
  expected_qty: number;
}

export const productStoresApi = {
  findAll: (params?: { store_id?: string; product_id?: string }) =>
    api.get<ProductStore[]>('/product-stores', params),
  findOne: (id: string) => api.get<ProductStore>(`/product-stores/${id}`),
  create: (payload: ProductStorePayload) => api.post<ProductStore>('/product-stores', payload),
  update: (id: string, payload: Partial<ProductStorePayload>) =>
    api.patch<ProductStore>(`/product-stores/${id}`, payload),
  remove: (id: string) => api.delete<ProductStore>(`/product-stores/${id}`),
};
