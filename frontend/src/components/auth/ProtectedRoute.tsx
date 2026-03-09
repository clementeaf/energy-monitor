import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../../hooks/auth/useAuth';
import type { Role } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: Readonly<ProtectedRouteProps>) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen bg-base">
        <div className="hidden w-56 border-r border-border bg-surface md:block" />
        <div className="flex-1 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 rounded-lg bg-raised" />
            <div className="h-[380px] w-full rounded-lg bg-raised" />
            <div className="grid grid-cols-3 gap-3">
              <div className="h-28 rounded-lg bg-raised" />
              <div className="h-28 rounded-lg bg-raised" />
              <div className="h-28 rounded-lg bg-raised" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ?? <Outlet />;
}
