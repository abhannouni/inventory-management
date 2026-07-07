import { api } from './client';
import type { Product } from '../types';

export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  distributeur: string;
  famille: string;
  sous_famille: string;
  format: string;
}

export const productsApi = {
  findAll: () => api.get<Product[]>('/products'),
  findOne: (id: string) => api.get<Product>(`/products/${id}`),
  create: (payload: ProductPayload) => api.post<Product>('/products', payload),
  update: (id: string, payload: Partial<ProductPayload>) =>
    api.patch<Product>(`/products/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/products/${id}`),
};
