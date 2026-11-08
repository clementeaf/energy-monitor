import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { MainContentErrorFallback } from '../errors/fallbacks';
import { LoadingSkeleton } from '../ui/QueryStateView';

/**
 * Suspense + ErrorBoundary alrededor del Outlet en el main (nivel más particular:
 * fallos de vista no tumbar sidebar/header; reset al cambiar de ruta).
 * Each page handles its own cross-tenant vs tenant-required logic.
 */
export function MainContentOutlet() {
  const location = useLocation();
  const resetKeys = [location.pathname];

  return (
    <ErrorBoundary resetKeys={resetKeys} fallback={MainContentErrorFallback}>
      <div key={location.pathname} className="h-full animate-route-in">
        <Suspense fallback={<div className="p-4 md:p-6"><LoadingSkeleton variant="page" /></div>}>
          <Outlet />
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
