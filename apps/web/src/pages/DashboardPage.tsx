import { usePermissions } from '../hooks/usePermissions';
import Spinner from '../components/ui/Spinner';
import SuperAdminDashboard from './dashboard/SuperAdminDashboard';
import AdminDashboard from './dashboard/AdminDashboard';
import GeneralManagementDashboard from './dashboard/GeneralManagementDashboard';
import SupervisorDashboard from './dashboard/SupervisorDashboard';
import MerchandiserDashboard from './dashboard/MerchandiserDashboard';

/**
 * Routes to a role-specific dashboard rather than rendering one shared view —
 * what each role should see on landing differs by what they can act on, not
 * just by what data happens to be fetched (see the per-role components under
 * pages/dashboard/ for what's shown and why).
 */
export default function DashboardPage() {
  const { role } = usePermissions();

  switch (role) {
    case 'super_admin':
      return <SuperAdminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'general_management':
      return <GeneralManagementDashboard />;
    case 'supervisor':
      return <SupervisorDashboard />;
    case 'merchandiser':
      return <MerchandiserDashboard />;
    default:
      return <Spinner center size="lg" />;
  }
}
