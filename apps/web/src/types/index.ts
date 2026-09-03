export type Role =
  | 'super_admin'
  | 'admin'
  | 'general_management'
  | 'supervisor'
  | 'merchandiser';

/** Mirrors the API's `VisitStatus`. `planned` rows live on the calendar and
 *  have no check-in yet; they are kept out of the visit history. */
export type VisitStatus = 'planned' | 'open' | 'completed';

export type AuditStatus = 'in_stock' | 'stock_disponible' | 'low_stock' | 'out_of_stock';

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
  role_id: string | null;
  custom_role?: RoleRecord | null;
  is_active: boolean;
  deactivated_at: string | null;
  last_login_at: string | null;
  region_id: string | null;
  region?: Region | null;
  /** The supervisor managing this user (relevant for merchandisers). */
  supervisor_id: string | null;
  supervisor?: { id: string; full_name: string } | null;
  /** Only present on the `/auth/me` response — the caller's effective permissions. */
  permissions?: string[];
  stores?: Store[];
  created_at: string;
  updated_at: string;
}

/** Distribution channel: Grande et Moyenne Surface, or Libre Service. */
export type StoreChannel = 'gms' | 'ls';

/** Commercial importance of a POS — A is the highest. */
export type StoreClassification = 'A' | 'B' | 'C' | 'D';

/** A Point of Sale (POS). */
export interface Store {
  id: string;
  name: string;

  // General information
  brand: string | null;
  channel: StoreChannel | null;
  classification: StoreClassification | null;

  // Address
  address: string;
  city: string | null;
  postal_code: string | null;
  region_id: string;
  region?: Region;
  opening_date: string | null;

  // Contacts
  section_manager_name: string | null;
  section_manager_phone: string | null;
  department_manager_name: string | null;
  department_manager_phone: string | null;
  gds_name: string | null;
  gds_phone: string | null;

  // Geolocation
  latitude: number | null;
  longitude: number | null;
  /** Explicit link; when empty the app derives one from lat/lng. */
  google_maps_url: string | null;

  is_active: boolean;
  /** Whether General Management is allowed to see this POS. */
  visible_to_gm: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  is_our_product: boolean;
  distributeur: string;
  famille: string;
  sous_famille: string;
  format: string;
  client_id: string | null;
  client?: Client | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SellOut {
  id: string;
  product_id: string;
  product?: Product;
  store_id: string;
  store?: Store;
  quantity: number;
  price: number;
  created_by_id: string | null;
  created_at: string;
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

// ─── Promos ─────────────────────────────────────────────────────────────────

export interface PromoItemPicture {
  id: string;
  promo_item_id: string;
  user_id: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

export interface PromoItem {
  id: string;
  promo_id: string;
  product_id: string;
  product?: Product;
  contenance: string;
  original_price: string;
  promo_price: string;
  created_at: string;
  /** Present on responses scoped to the caller (or to one uploader, for the Super Admin drill-down). */
  my_picture?: PromoItemPicture | null;
}

export interface Promo {
  id: string;
  title: string | null;
  is_active: boolean;
  created_by_id: string | null;
  created_by?: { id: string; full_name: string } | null;
  created_at: string;
  updated_at: string;
  items: PromoItem[];
  _count?: { items: number };
}

export interface PromoPictureUploader {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  uploaded_count: number;
  last_upload_at: string;
}

export interface PromoPictureUploadersResponse {
  promo_id: string | null;
  total_items: number;
  users: PromoPictureUploader[];
}

export interface PromoUserPictureView {
  promo_id: string;
  title: string | null;
  items: PromoItem[];
}

// ─── Price Surveys (Relevé de Prix) ────────────────────────────────────────────

export interface PriceSurveyItem {
  id: string;
  submission_id: string;
  product_id: string;
  product?: Product;
  price_normal: string | null;
  price_promo: string | null;
  etat: string | null;
  competitor_name: string | null;
  competitor_cl: string | null;
  competitor_price_normal: string | null;
  competitor_price_promo: string | null;
  competitor_etat: string | null;
  created_at: string;
  updated_at: string;
}

export interface PriceSurveySubmission {
  id: string;
  user_id: string;
  store_id: string;
  user?: { id: string; full_name: string };
  store?: { id: string; name: string };
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  items: PriceSurveyItem[];
  _count?: { items: number };
}

export interface PriceSurveyAssignment {
  id: string;
  user_id: string;
  store_id: string;
  product_id: string;
  product?: Product;
  created_at: string;
}

export type NotificationType =
  | 'promo_created'
  | 'price_survey_products_assigned'
  | 'visit_plan_submitted'
  | 'visit_plan_changed'
  | 'visit_plan_approved'
  | 'visit_plan_declined'
  | 'visit_plan_adjusted'
  | 'visit_plan_assigned'
  | 'visit_plan_reminder'
  | 'visit_plan_missing';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ProductRequest {
  id: string;
  store_id: string;
  store?: Store;
  sous_famille: string;
  width: number;
  height: number;
  depth: number;
  image_urls: string[];
  created_by_id: string | null;
  created_by?: { id: string; full_name: string };
  created_at: string;
}

export interface AuditItem {
  id: string;
  visit_id: string;
  product_id: string;
  qty_found: number;
  /** Snapshot of ProductStore.expected_qty at audit time. */
  expected_qty: number;
  /** qty_found − expected_qty. Negative = short of what the shelf should hold. */
  variance: number;
  notes: string | null;
  photo_url: string | null;
  has_promo: boolean;
  status: AuditStatus;
  product?: Product;
  created_at: string;
  updated_at: string;
}

export type VisitReportCategory = 'display' | 'tg' | 'mea' | 'plv';

export interface VisitReportCard {
  id: string;
  category: VisitReportCategory;
  note: string | null;
  photos: string[];
}

export interface Visit {
  id: string;
  user_id: string;
  store_id: string;
  status: VisitStatus;
  /** Set when the visit came off a month plan rather than an ad-hoc check-in. */
  plan_id: string | null;
  /** `YYYY-MM-DD` calendar day this visit is planned for. Null for ad-hoc visits. */
  planned_date: string | null;
  /** `HH:mm` wall-clock at the point of sale, or null when only the day matters. */
  planned_time: string | null;
  planned_notes: string | null;
  planned_by_id: string | null;
  checkin_lat: number;
  checkin_lng: number;
  checkout_lat: number | null;
  checkout_lng: number | null;
  checkin_at: string;
  checkout_at: string | null;
  /** Server-computed `checkout_at - checkin_at`, in seconds. Null while the visit is open. */
  duration_seconds: number | null;
  /**
   * Duration as of the moment the server built this response, in seconds. The UI
   * timer uses this as its baseline rather than reading the device clock.
   */
  elapsed_seconds: number;
  /** How much of the POS product list has been audited. Check-out is blocked until complete. */
  audit_progress?: AuditProgress;
  /** Legacy supervisor spot-check report — superseded by report_cards, kept for historical visits. */
  report_title: string | null;
  report_note: string | null;
  report_photos: string[];
  /** Supervisor spot-check report cards, filled in instead of a product audit. */
  report_cards?: VisitReportCard[];
  /** Merchandiser "before/after" shelf photos, bracketing the product audit. */
  initial_note: string | null;
  initial_photos: string[];
  final_note: string | null;
  final_photos: string[];
  store?: Store;
  user?: User;
  audit_items?: AuditItem[];
  created_at: string;
  updated_at: string;
}

/** Aggregated details behind the Point of Sale details page. */
export interface StoreOverview {
  store: Store;
  team: Array<Pick<User, 'id' | 'full_name' | 'email' | 'role' | 'is_active'>>;
  visits: Array<{
    id: string;
    status: VisitStatus;
    checkin_at: string;
    checkout_at: string | null;
    duration_seconds: number | null;
    user?: Pick<User, 'id' | 'full_name' | 'role'> | null;
    audited: number;
  }>;
  product_availability: Array<{
    product: Product;
    expected_qty: number;
    last_qty_found: number | null;
    last_status: AuditStatus | null;
    last_seen_at: string | null;
  }>;
  stock_summary: {
    expected_products: number;
    audited: number;
    in_stock: number;
    stock_disponible: number;
    low_stock: number;
    out_of_stock: number;
  };
  stockouts: Array<{
    product: Product;
    checkin_at: string;
    visit_id: string;
    reported_by?: Pick<User, 'id' | 'full_name' | 'role'> | null;
  }>;
  photos: Array<{
    url: string;
    product: Product;
    checkin_at: string;
    visit_id: string;
  }>;
}

export interface AuditProgress {
  audited: number;
  expected: number;
  is_complete: boolean;
}

export interface VisitSummary {
  total: number;
  inStock: number;
  stockDisponible: number;
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



export type VisitPlanStatus = 'draft' | 'pending_review' | 'approved' | 'declined';

/**
 * A visit as it sits on a month plan. Every row on a plan has a `planned_date`,
 * and a still-`planned` one has not been checked into — so unlike a `Visit`
 * coming off the visit endpoints (which never return `planned` rows) its
 * check-in timestamp can still be empty.
 */
export interface PlannedVisit extends Omit<Visit, 'checkin_at' | 'planned_date'> {
  planned_date: string;
  checkin_at: string | null;
}

/**
 * One person's month of planned visits. The planned days themselves are `Visit`
 * rows with `status: 'planned'`, carried on `visits` — this object holds only
 * the month's review state.
 */
export interface VisitPlan {
  id: string;
  user_id: string;
  user?: { id: string; full_name: string; email: string; role: Role };
  year: number;
  month: number;
  status: VisitPlanStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by_id: string | null;
  reviewed_by?: { id: string; full_name: string } | null;
  review_note: string | null;
  visits: PlannedVisit[];
  created_at: string;
  updated_at: string;
}

// ─── RBAC ──────────────────────────────────────────────────────────────────────

/** A role row in the database. Named `RoleRecord` so it doesn't clash with the `Role` union. */
export interface RoleRecord {
  id: string;
  name: string;
  label: string;
  description: string | null;
  is_system: boolean;
  user_count?: number;
  permission_count?: number;
  /** Granted permission codes — only returned by the single-role endpoint. */
  permissions?: string[];
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  code: string;
  resource: string;
  action: string;
  description: string | null;
}

export interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}

// ─── Clients, plans, subscriptions ─────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  code: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  logo_url: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface Plan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: string;
  currency: string;
  billing_period: BillingPeriod;
  max_users: number | null;
  max_pos: number | null;
  max_products: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired';

export interface Subscription {
  id: string;
  client_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  client?: Client;
  plan?: Plan;
  created_at: string;
  updated_at: string;
}

// ─── KPIs & dashboards ─────────────────────────────────────────────────────────

export type KpiDirection = 'higher_is_better' | 'lower_is_better';

export interface Kpi {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  target: string | null;
  warn_below: string | null;
  direction: KpiDirection;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type WidgetType = 'kpi_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table';

export interface DashboardWidget {
  id: string;
  dashboard_id: string;
  kpi_id: string | null;
  type: WidgetType;
  title: string;
  config: Record<string, unknown> | null;
  position: number;
  width: number;
  height: number;
  is_visible: boolean;
  kpi?: Kpi | null;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string | null;
  role_id: string | null;
  owner_id: string | null;
  is_default: boolean;
  widgets?: DashboardWidget[];
  created_at: string;
  updated_at: string;
}

// ─── Envelopes ─────────────────────────────────────────────────────────────────

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface Paginated<T> {
  items: T[];
  meta: PageMeta;
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
