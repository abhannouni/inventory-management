import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/components.css';

import ProtectedRoute from './components/layout/ProtectedRoute';
import RequirePermission from './components/layout/RequirePermission';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import RolesPage from './pages/roles/RolesPage';
import RegionsPage from './pages/regions/RegionsPage';
import StoresPage from './pages/stores/StoresPage';
import StoreDetailPage from './pages/stores/StoreDetailPage';
import PosDirectoryPage from './pages/pos/PosDirectoryPage';
import ProductsPage from './pages/products/ProductsPage';
import ProductStoresPage from './pages/product-stores/ProductStoresPage';
import VisitsPage from './pages/visits/VisitsPage';
import VisitDetailPage from './pages/visits/VisitDetailPage';
import AuditItemsPage from './pages/audit-items/AuditItemsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SchedulePage from './pages/schedule/SchedulePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* Administration — also enforced server-side by PermissionsGuard. */}
            <Route element={<RequirePermission anyOf={['users.create', 'users.update', 'users.delete']} />}>
              <Route path="/users" element={<UsersPage />} />
            </Route>
            <Route element={<RequirePermission anyOf={['roles.read']} />}>
              <Route path="/roles" element={<RolesPage />} />
            </Route>

            <Route path="/regions" element={<RegionsPage />} />
            {/* POS directory + map — every authenticated role, scoped server-side. */}
            <Route path="/pos" element={<PosDirectoryPage />} />
            <Route path="/pos/:id" element={<StoreDetailPage />} />

            {/* POS management (CRUD) — managers only; the guard also runs server-side. */}
            <Route element={<RequirePermission anyOf={['pos.create', 'pos.update', 'pos.delete']} />}>
              <Route path="/stores" element={<StoresPage />} />
            </Route>
            <Route path="/stores/:id" element={<StoreDetailPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/product-stores" element={<ProductStoresPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/visits" element={<VisitsPage />} />
            <Route path="/visits/:id" element={<VisitDetailPage />} />
            <Route path="/my-visit" element={<Navigate to="/visits" replace />} />
            <Route path="/audit-items" element={<AuditItemsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <ToastContainer
        position="top-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme="light"
        style={{ fontSize: 14 }}
      />
    </BrowserRouter>
  );
}
