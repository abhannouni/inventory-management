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
  'schedules',
  'reports',
  'settings',
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
  ...crud('schedules', 'schedules'),

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
    ...crud('schedules', '').map((p) => p.code),
    ...crud('visits', '').map((p) => p.code),
    ...crud('audit_items', '').map((p) => p.code),
    'kpis.read',
    'dashboards.read',
    'reports.read',
    'reports.export',
  ],

  // Reads consolidated data, but only for the POS the Super Admin has exposed.
  general_management: [
    'pos.read',
    'regions.read',
    'products.read',
    'clients.read',
    'visits.read',
    'audit_items.read',
    'schedules.read',
    'kpis.read',
    'dashboards.read',
    'reports.read',
    'reports.export',
    'users.read',
  ],

  supervisor: [
    'users.read',
    'pos.read',
    'regions.read',
    'products.read',
    'inventory.read',
    ...crud('schedules', '').map((p) => p.code),
    'visits.read',
    'audit_items.read',
    'audit_items.update',
    'reports.read',
    'kpis.read',
    'dashboards.read',
  ],

  merchandiser: [
    'pos.read',
    'products.read',
    'inventory.read',
    'schedules.read',
    'visits.read',
    'visits.create',
    'visits.update',
    ...crud('audit_items', '').map((p) => p.code),
    'dashboards.read',
  ],
};
