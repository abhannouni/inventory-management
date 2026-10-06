import { api } from './client';
import type { Paginated } from '../types';

export type OrderStatus = 'confirmed' | 'cancelled';

/** Decimal columns arrive as strings — read them with `Number()`. */
type Money = string;

interface Person {
  id: string;
  full_name: string;
}

export interface OrderListItem {
  id: string;
  number: string;
  status: OrderStatus;
  total_ht: Money;
  total_tva: Money;
  total_ttc: Money;
  created_at: string;
  store: { id: string; name: string; city: string | null } | null;
  invoice: { id: string; number: string; issued_at: string } | null;
  created_by: Person | null;
  _count: { items: number };
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string;
  position: number;
  quantity: number;
  unit_price: Money;
  tva_rate: Money;
  total_ht: Money;
  tva_amount: Money;
  total_ttc: Money;
}

export interface StoreSnapshot {
  id: string;
  name: string;
  brand: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
}

export interface Order {
  id: string;
  number: string;
  status: OrderStatus;
  notes: string | null;
  total_ht: Money;
  total_tva: Money;
  total_ttc: Money;
  created_at: string;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_by: Person | null;
  cancelled_by: Person | null;
  store: { id: string; name: string; region: { id: string; name: string } | null } | null;
  items: OrderItem[];
  invoice: { id: string; number: string; issued_at: string; store_snapshot: StoreSnapshot } | null;
}

export interface OrderLineInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  tva_rate: number;
}

export interface OrderQuery {
  page?: number;
  limit?: number;
  search?: string;
  store_id?: string;
  status?: OrderStatus | '';
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
}

export type LastPrices = Record<string, { unit_price: number; tva_rate: number; at_this_store: boolean }>;

export const ordersApi = {
  list: (query: OrderQuery) => api.get<Paginated<OrderListItem>>('/orders', { ...query }),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  create: (payload: { store_id: string; items: OrderLineInput[]; notes?: string }) =>
    api.post<Order>('/orders', payload),
  cancel: (id: string, reason?: string) => api.patch<Order>(`/orders/${id}/cancel`, { reason }),
  lastPrices: (storeId: string) => api.get<LastPrices>(`/orders/last-prices/${storeId}`),
};
