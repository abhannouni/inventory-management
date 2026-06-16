import { useAppSelector } from './useAppDispatch';
import type { Role } from '../types';

export function usePermissions() {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role as Role | undefined;

  const is = (...roles: Role[]) => !!role && roles.includes(role);

  return {
    role,
    isSuperAdmin: is('super_admin'),
    isAdmin: is('super_admin', 'admin'),
    isSupervisor: is('super_admin', 'admin', 'supervisor'),
    isMerchandiser: is('merchandiser'),
    canManageUsers: is('super_admin', 'admin'),
    canManageRegions: is('super_admin'),
    canManageStores: is('super_admin', 'admin'),
    canManageProducts: is('super_admin', 'admin'),
    canManageProductStores: is('super_admin', 'admin'),
    canCheckin: !!role,
    canManageSchedules: is('super_admin', 'admin', 'supervisor'),
  };
}
