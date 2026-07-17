import { api } from './client';
import type { Product } from '../types';

export interface ProductPayload {
  name: string;
  sku: string;
  category: string;
  is_our_product: boolean;
  distributeur: string;
  famille: string;
  sous_famille: string;
  format: string;
}

export interface BulkImportRowError {
  row: number;
  message: string;
}

export interface BulkImportResult {
  created: number;
  failed: number;
  errors: BulkImportRowError[];
}

export const productsApi = {
  findAll: () => api.get<Product[]>('/products'),
  findOne: (id: string) => api.get<Product>(`/products/${id}`),
  create: (payload: ProductPayload) => api.post<Product>('/products', payload),
  update: (id: string, payload: Partial<ProductPayload>) =>
    api.patch<Product>(`/products/${id}`, payload),
  remove: (id: string) => api.delete<void>(`/products/${id}`),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<BulkImportResult>('/products/bulk-import', formData);
  },
};
