import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/useAppDispatch';
import { fetchMe } from '../../store/slices/authSlice';
import Spinner from '../ui/Spinner';

export default function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const { token, user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  if (!token) return <Navigate to="/login" replace />;
  // A token with no user yet is always "still loading" here, regardless of
  // the `loading` flag's precise timing — on the first render after a hard
  // reload, `loading` is still its false initial value and `user` is still
  // null, so gating on `loading` raced this into a false "not authenticated"
  // redirect before fetchMe() had even started. An actually-invalid token
  // still falls through to the redirect above: the fetch client's 401 handling
  // clears the token (via the 'auth:session-expired' event) once a real
  // refresh attempt fails, which re-renders this component with `token` gone.
  if (!user) return <Spinner center size="lg" />;

  return <Outlet />;
}
