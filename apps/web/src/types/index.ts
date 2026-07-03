export type Role = 'super_admin' | 'admin' | 'supervisor' | 'merchandiser';

export type VisitStatus = 'open' | 'closed';

export type AuditStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Region {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  region_id: string | null;
  region?: Region | null;
  created_at: string;
  updated_at: string;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  region_id: string;
  region?: Region;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  distributeur: string;
  famille: string;
  sous_famille: string;
  format: string;
  created_at: string;
  updated_at: string;
}

export interface ProductStore {
  id: string;
  product_id: string;
  store_id: string;
  expected_qty: number;
  product?: Product;
  store?: Store;
  created_at: string;
  updated_at: string;
}

export interface AuditItem {
  id: string;
  visit_id: string;
  product_id: string;
  qty_found: number;
  notes: string | null;
  photo_url: string | null;
  status: AuditStatus;
  product?: Product;
  created_at: string;
  updated_at: string;
}

export interface Visit {
  id: string;
  user_id: string;
  store_id: string;
  status: VisitStatus;
  checkin_lat: number;
  checkin_lng: number;
  checkout_lat: number | null;
  checkout_lng: number | null;
  checkin_at: string;
  checkout_at: string | null;
  store?: Store;
  user?: User;
  audit_items?: AuditItem[];
  created_at: string;
  updated_at: string;
}

export interface VisitSummary {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  completionPct: number;
}

export interface VisitReport extends Visit {
  summary: VisitSummary;
}

export interface StoreReport {
  store: Store;
  visits: VisitReport[];
}

export interface ProductReport {
  product: Product;
  history: Array<{
    visit_id: string;
    store: Store;
    checkin_at: string;
    qty_found: number;
    status: AuditStatus;
    notes: string | null;
  }>;
}

export type ScheduleStatus = 'pending' | 'completed' | 'cancelled';

export interface Schedule {
  id: string;
  user_id: string;
  store_id: string;
  created_by_id: string;
  scheduled_at: string;
  notes: string | null;
  status: ScheduleStatus;
  user?: User;
  store?: Store;
  created_by?: User;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}
