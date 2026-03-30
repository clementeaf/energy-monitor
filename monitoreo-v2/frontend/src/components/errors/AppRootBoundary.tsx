import type { ReactElement, ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AppErrorFallback } from './fallbacks';

interface AppRootBoundaryProps {
  children: ReactNode;
}

/**
 * Boundary más general: envuelve proveedores y router.
 */
export function AppRootBoundary(props: AppRootBoundaryProps): ReactElement {
  const { children } = props;
  return <ErrorBoundary fallback={AppErrorFallback}>{children}</ErrorBoundary>;
}
