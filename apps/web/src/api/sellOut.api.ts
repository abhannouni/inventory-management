import { api } from './client';
import type { SellOut } from '../types';

export interface SellOutPayload {
  product_id: string;
  store_id: string;
  quantity: number;
  price: number;
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

export const sellOutApi = {
  findAll: () => api.get<SellOut[]>('/sell-out'),
  create: (payload: SellOutPayload) => api.post<SellOut>('/sell-out', payload),
  bulkImport: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.upload<BulkImportResult>('/sell-out/bulk-import', formData);
  },
};
