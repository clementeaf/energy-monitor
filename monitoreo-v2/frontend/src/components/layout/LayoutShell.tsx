import type { ReactElement } from 'react';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { LayoutErrorFallback } from '../errors/fallbacks';
import { AppLayout } from './AppLayout';

/**
 * ErrorBoundary intermedio: fallos en chrome (sidebar/header) o en el shell del layout.
 */
export function LayoutShell(): ReactElement {
  return (
    <ErrorBoundary fallback={LayoutErrorFallback}>
      <AppLayout />
    </ErrorBoundary>
  );
}
