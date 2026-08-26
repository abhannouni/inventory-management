/**
 * Canonical permission catalogue.
 *
 * This is the single source of truth: the seed upserts one `Permission` row per
 * entry here, and `@RequirePermissions()` may only reference codes from this list.
 * Adding a permission means adding it here, then re-running the seed.
 */

export const RESOURCES = [
  'users',
  'roles',
  'clients',
  'pos',
  'regions',
  'products',
  'inventory',
  'kpis',
  'dashboards',
  'plans',
  'subscriptions',
  'visits',
  'audit_items',
  'visit_plans',
  'reports',
  'settings',
  'sell_out',
  'hr',
  'product_requests',
  'promos',
  'price_surveys',
] as const;

export type Resource = (typeof RESOURCES)[number];

interface PermissionDef {
  code: string;
  resource: Resource;
  action: string;
  description: string;
}

/** Build the four standard CRUD permissions for a resource. */
const crud = (resource: Resource, label: string): PermissionDef[] => [
  { code: `${resource}.read`, resource, action: 'read', description: `View ${label}` },
  { code: `${resource}.create`, resource, action: 'create', description: `Create ${label}` },
  { code: `${resource}.update`, resource, action: 'update', description: `Edit ${label}` },
  { code: `${resource}.delete`, resource, action: 'delete', description: `Delete ${label}` },
];

export const PERMISSIONS: PermissionDef[] = [
  ...crud('users', 'users'),
  {
    code: 'users.activate',
    resource: 'users',
    action: 'activate',
    description: 'Activate and deactivate user accounts',
  },
  {
    code: 'users.assign_stores',
    resource: 'users',
    action: 'assign_stores',
    description: 'Assign points of sale to a user',
  },

  ...crud('roles', 'roles'),
  {
    code: 'roles.assign_permissions',
    resource: 'roles',
    action: 'assign_permissions',
    description: 'Grant or revoke permissions on a role',
  },

  ...crud('clients', 'clients'),
  ...crud('pos', 'points of sale'),
  {
    code: 'pos.set_visibility',
    resource: 'pos',
    action: 'set_visibility',
    description: 'Choose which points of sale General Management can see',
  },

  ...crud('regions', 'regions'),
  ...crud('products', 'products'),
  ...crud('inventory', 'expected quantities'),
  ...crud('kpis', 'KPIs'),
  ...crud('dashboards', 'dashboards'),
  ...crud('plans', 'plans'),
  ...crud('subscriptions', 'subscriptions'),
  {
    code: 'subscriptions.change_status',
    resource: 'subscriptions',
    action: 'change_status',
    description: 'Change a subscription status (activate, cancel, expire…)',
  },

  ...crud('visits', 'visits'),
  ...crud('audit_items', 'audit items'),

  // Visit planning (lives inside the Visits module): `create`/`update`/`delete`
  // let a supervisor build and submit their own month; `review` (Super Admin /
  // Admin only) covers approve/decline/adjust on anyone's month, and filling in
  // a merchandiser's month for them. Kept separate from `update` so a
  // supervisor's self-service edit right never doubles as review authority —
  // same split as `price_surveys.update` vs `.manage`.
  ...crud('visit_plans', 'visit plans'),
  {
    code: 'visit_plans.review',
    resource: 'visit_plans',
    action: 'review',
    description: "Approve, decline, or fill in someone's month of planned visits",
  },

  { code: 'reports.read', resource: 'reports', action: 'read', description: 'View reports' },
  { code: 'reports.export', resource: 'reports', action: 'export', description: 'Export reports' },

  {
    code: 'settings.read',
    resource: 'settings',
    action: 'read',
    description: 'View platform settings',
  },
  {
    code: 'settings.update',
    resource: 'settings',
    action: 'update',
    description: 'Change platform settings',
  },
  {
    code: 'settings.view_audit_log',
    resource: 'settings',
    action: 'view_audit_log',
    description: 'View the administration audit log',
  },

  ...crud('sell_out', 'sell-out records'),

  // Custom Product Requests: a field-submitted log (store, sub-family,
  // dimensions, photo). Shown to users under the "Marketing" nav label/page
  // title — the resource code predates that display name and was kept to
  // avoid an unrelated rename (same reasoning as `inventory` staying
  // `inventory` under the "Stock" label).
  ...crud('product_requests', 'custom product requests (Marketing)'),

  // Not included in any ROLE_PRESETS entry — only super_admin (which bypasses
  // the preset table and gets every permission) can reach the HR module.
  { code: 'hr.read', resource: 'hr', action: 'read', description: 'View HR module (super admin only)' },

  // Promos: `read` is granted broadly below (every role sees the current
  // promo table); create/update/delete are deliberately absent from every
  // ROLE_PRESETS entry, so only super_admin can publish/edit/remove a promo
  // batch — same "no preset grant" pattern as `hr.read` above.
  ...crud('promos', 'promos'),
  {
    code: 'promos.upload_picture',
    resource: 'promos',
    action: 'upload_picture',
    description: 'Upload a shelf photo for a promo product',
  },

  // Price Surveys (Relevé de Prix): `update` lets a field user fill in and
  // submit their own survey; `manage` (Super Admin / Admin only) covers
  // assigning products to a user's survey and browsing submission history.
  {
    code: 'price_surveys.update',
    resource: 'price_surveys',
    action: 'update',
    description: 'Fill in and submit your own price survey',
  },
  {
    code: 'price_surveys.manage',
    resource: 'price_surveys',
    action: 'manage',
    description: "Assign products to a user's price survey and browse submission history",
  },
];

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

export type PermissionCode = string;

/**
 * Default permission set per built-in role.
 * `super_admin` is intentionally absent — it is granted every permission and
 * short-circuits the guard, so it can never be locked out of the platform.
 */
export const ROLE_PRESETS: Record<string, string[]> = {
  admin: [
    ...crud('users', '').map((p) => p.code),
    'users.activate',
    'users.assign_stores',
    'roles.read',
    ...crud('clients', '').map((p) => p.code),
    ...crud('pos', '').map((p) => p.code),
    // Regions stay a Super-Admin-only concern, matching the pre-RBAC rules.
    'regions.read',
    ...crud('products', '').map((p) => p.code),
    ...crud('inventory', '').map((p) => p.code),
    // Admin reviews supervisors' months (approve/decline/adjust) and fills in
    // merchandisers' months, but never owns one — no create/update/delete here,
    // the `supervisor` preset below being the mirror image.
    'visit_plans.read',
    'visit_plans.review',
    ...crud('visits', '').map((p) => p.code),
    ...crud('audit_items', '').map((p) => p.code),
    'kpis.read',
    'dashboards.read',
    'reports.read',
    'reports.export',
    ...crud('sell_out', '').map((p) => p.code),
    ...crud('product_requests', '').map((p) => p.code),
    'promos.read',
    'price_surveys.manage',
  ],

  // Reads consolidated data, but only for the POS the Super Admin has exposed.
  general_management: [
    'pos.read',
    'regions.read',
    'products.read',
    'clients.read',
    'visits.read',
    'audit_items.read',
    'visit_plans.read',
    'kpis.read',
    'dashboards.read',
    'reports.read',
    'reports.export',
    'users.read',
    'sell_out.read',
    'product_requests.read',
    'promos.read',
  ],

  supervisor: [
    'users.read',
    'pos.read',
    'regions.read',
    // Standalone Produits/Stock/Rapports pages removed from this role's
    // sidebar by request. The audit/visit flow still reads the product
    // catalog and product-store assignments — see `RequireAnyPermission`
    // on the products and product-store list endpoints, which fall back
    // to `visits.create`/`visits.update`/`audit_items.*` for exactly this.
    // A supervisor may create/edit/delete the planned visits on their own month
    // (ownership enforced in VisitPlansService) but never `visit_plans.review`
    // — that's reviewer-only, and it is what a reviewer uses to fill in a
    // merchandiser's month for them.
    ...crud('visit_plans', '').map((p) => p.code),
    'visits.read',
    // A supervisor performs their own spot-check visits too (not just field
    // audits by merchandisers), so they need the same create/update rights a
    // merchandiser has for the visit lifecycle — previously only granted via
    // an unconditional frontend `!!role` check with no backend permission
    // behind it. This makes that already-working behavior explicit.
    'visits.create',
    'visits.update',
    'audit_items.read',
    'audit_items.create',
    'audit_items.update',
    'kpis.read',
    'dashboards.read',
    'sell_out.read',
    'product_requests.read',
    'product_requests.create',
    'product_requests.update',
    'promos.read',
    'promos.upload_picture',
    'price_surveys.update',
  ],

  merchandiser: [
    'pos.read',
    // See the comment on `supervisor` above — Produits/Stock/Rapports removed
    // from the sidebar; the field audit flow keeps working via the
    // `RequireAnyPermission` fallback on those endpoints.
    // Read-only: a merchandiser's month is filled in for them by a reviewer,
    // so no create/update/delete here — only the right to see it and check in
    // from it.
    'visit_plans.read',
    'visits.read',
    'visits.create',
    'visits.update',
    ...crud('audit_items', '').map((p) => p.code),
    'dashboards.read',
    ...crud('product_requests', '').map((p) => p.code),
    'promos.read',
    'promos.upload_picture',
    'price_surveys.update',
  ],
};
