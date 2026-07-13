import { Navigate, Outlet } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

interface RequirePermissionProps {
  /** The user needs at least one of these codes to reach the nested routes. */
  anyOf: string[];
}

/**
 * Route-level gate. Belt-and-braces only — hiding a route stops accidental
 * navigation, but the API enforces the same permissions on every request.
 */
export default function RequirePermission({ anyOf }: RequirePermissionProps) {
  const { canAny } = usePermissions();

  if (!canAny(...anyOf)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Outlet />;
}
