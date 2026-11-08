import { Suspense, type ReactElement } from 'react';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { MainContentErrorFallback } from '../errors/fallbacks';
import { LoadingSkeleton } from '../ui/QueryStateView';
import { LazyLoginPage } from '../../app/lazyPages';

/**
 * Suspense + ErrorBoundary para la ruta de login (chunk aparte; error aislado de la shell).
 */
export function LoginRouteShell(): ReactElement {
  return (
    <ErrorBoundary fallback={MainContentErrorFallback}>
      <Suspense fallback={<LoadingSkeleton variant="page" />}>
        <LazyLoginPage />
      </Suspense>
    </ErrorBoundary>
  );
}
