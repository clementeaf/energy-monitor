import { Navigate, Outlet, useLocation } from 'react-router';
import { appRoutes } from '../../app/appRoutes';
import { useAuth } from '../../hooks/auth/useAuth';
import { hasGlobalSiteAccess } from '../../auth/siteScope';
import { useAppStore } from '../../store/useAppStore';
import type { Role } from '../../types/auth';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
  children?: React.ReactNode;
  enforceSiteContext?: boolean;
}

export function ProtectedRoute({ allowedRoles, children, enforceSiteContext = true }: Readonly<ProtectedRouteProps>) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { selectedSiteId } = useAppStore();
  const location = useLocation();

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

  const requiresSiteContext = !!user && !hasGlobalSiteAccess(user.siteIds) && user.siteIds.length > 1;

  if (requiresSiteContext && enforceSiteContext && !selectedSiteId) {
    return <Navigate to={appRoutes.contextSelect.path} replace state={{ from: location.pathname }} />;
  }

  if (!enforceSiteContext && location.pathname === appRoutes.contextSelect.path && selectedSiteId) {
    return <Navigate to={appRoutes.buildings.path} replace />;
  }

  return children ?? <Outlet />;
}
