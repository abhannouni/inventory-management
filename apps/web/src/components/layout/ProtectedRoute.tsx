import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchMe } from '../../store/slices/authSlice';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const { token, user, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading && !user) return <Spinner center size="lg" />;
  if (!user && !loading) return <Navigate to="/login" replace />;

  return <Outlet />;
}
