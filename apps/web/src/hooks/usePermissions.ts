import { useMemo } from 'react';
import { useAppSelector } from './useAppDispatch';
import type { Role } from '../types';

/**
 * Permission-aware access checks, backed by the codes the API returns from
 * `/auth/me`. These gate the UI only — every check is enforced again server-side
 * by `PermissionsGuard`, so a tampered client gains nothing.
 */
export function usePermissions() {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role as Role | undefined;

  const granted = useMemo(() => new Set(user?.permissions ?? []), [user?.permissions]);

  /** True when every listed permission is held. */
  const can = (...codes: string[]) => codes.every((c) => granted.has(c));
  /** True when at least one listed permission is held. */
  const canAny = (...codes: string[]) => codes.some((c) => granted.has(c));
  /** Holds any write permission on a resource — i.e. it is manageable, not merely viewable. */
  const canManage = (resource: string) =>
    canAny(`${resource}.create`, `${resource}.update`, `${resource}.delete`);

  const is = (...roles: Role[]) => !!role && roles.includes(role);

  const canManageUsers = canManage('users');
  const canManageRoles = canManage('roles');
  const canManageClients = canManage('clients');
  const canManageKpis = canManage('kpis');
  const canManagePlans = canManage('plans');
  const canManageSubscriptions = canManage('subscriptions');

  return {
    role,
    permissions: granted,
    can,
    canAny,
    canManage,

    isSuperAdmin: is('super_admin'),
    isAdmin: is('super_admin', 'admin'),
    isGeneralManagement: is('general_management'),
    isSupervisor: is('super_admin', 'admin', 'supervisor'),
    isMerchandiser: is('merchandiser'),

    canManageUsers,
    canManageRegions: canManage('regions'),
    canManageStores: canManage('pos'),
    canManageProducts: canManage('products'),
    canManageProductStores: canManage('inventory'),
    canManagePromos: canManage('promos'),
    canUploadPromoPicture: can('promos.upload_picture'),
    canManageSchedules: canManage('schedules'),
    // A visit is a create (check-in) followed by an update (check-out) — not
    // something every authenticated role does. General Management, for
    // instance, has no `visits.create` and correctly never sees a check-in
    // button, where this used to be a blanket `!!role`.
    canCheckin: can('visits.create'),

    // Administration modules
    canManageRoles,
    canManageClients,
    canManageKpis,
    canManagePlans,
    canManageSubscriptions,
    canManageDashboards: canManage('dashboards'),
    canSetPosVisibility: can('pos.set_visibility'),
    canActivateUsers: can('users.activate'),

    /** Whether to surface the Administration section at all. */
    hasAdminAccess:
      canManageUsers ||
      canManageRoles ||
      canManageClients ||
      canManageKpis ||
      canManagePlans ||
      canManageSubscriptions,
  };
}
