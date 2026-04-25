import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { MainContentErrorFallback, PageLoadFallback } from '../errors/fallbacks';

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
      <Suspense fallback={<PageLoadFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  );
}
