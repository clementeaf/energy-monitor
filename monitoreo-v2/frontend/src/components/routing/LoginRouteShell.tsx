import { Suspense, type ReactElement } from 'react';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { MainContentErrorFallback, PageLoadFallback } from '../errors/fallbacks';
import { LazyLoginPage } from '../../app/lazyPages';

/**
 * Suspense + ErrorBoundary para la ruta de login (chunk aparte; error aislado de la shell).
 */
export function LoginRouteShell(): ReactElement {
  return (
    <ErrorBoundary fallback={MainContentErrorFallback}>
      <Suspense fallback={<PageLoadFallback />}>
        <LazyLoginPage />
      </Suspense>
    </ErrorBoundary>
  );
}
