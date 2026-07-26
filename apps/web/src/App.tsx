import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/components.css';

import ProtectedRoute from './components/layout/ProtectedRoute';
import RequirePermission from './components/layout/RequirePermission';
import AppLayout from './components/layout/AppLayout';
import ErrorBoundary from './components/layout/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import { NAV_PAGES } from './config/navigation';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              {/*
                Every protected page comes from one config (NAV_PAGES), so a page
                can never be reachable here without also being permission-checked
                here — the same list drives the sidebar and mobile nav, so a page
                can't show up in the menu without a matching route either.
              */}
              {NAV_PAGES.map(({ id, path, element: Element, permissions }) => (
                <Route
                  key={id}
                  path={path}
                  element={
                    <RequirePermission permissions={permissions}>
                      <Element />
                    </RequirePermission>
                  }
                />
              ))}

              <Route path="/my-visit" element={<Navigate to="/visits" replace />} />
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
    </ErrorBoundary>
  );
}
