import { api } from './client';
import type { SellOut } from '../types';

export interface SellOutPayload {
  product_id: string;
  store_id: string;
  quantity: number;
  price: number;
}

export const sellOutApi = {
  findAll: () => api.get<SellOut[]>('/sell-out'),
  create: (payload: SellOutPayload) => api.post<SellOut>('/sell-out', payload),
};
