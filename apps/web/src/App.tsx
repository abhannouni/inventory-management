import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/components.css';

import ProtectedRoute from './components/layout/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import RegionsPage from './pages/regions/RegionsPage';
import StoresPage from './pages/stores/StoresPage';
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
            <Route path="/users" element={<UsersPage />} />
            <Route path="/regions" element={<RegionsPage />} />
            <Route path="/stores" element={<StoresPage />} />
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
