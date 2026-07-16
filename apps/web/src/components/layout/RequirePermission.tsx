import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import { hasPageAccess } from '../../config/navigation';

interface RequirePermissionProps {
  /** Empty = any authenticated user. Otherwise the caller needs at least one. */
  permissions: string[];
  children: ReactNode;
}

/**
 * Per-route access gate. This is the frontend half of the permission-to-page
 * map — belt-and-braces only, since the API enforces the same permissions on
 * every request regardless of what the client does. A user who guesses a URL
 * they lack permission for is bounced to the dashboard, never shown the page.
 */
export default function RequirePermission({ permissions, children }: RequirePermissionProps) {
  const { permissions: granted } = usePermissions();

  if (!hasPageAccess(granted, permissions)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
