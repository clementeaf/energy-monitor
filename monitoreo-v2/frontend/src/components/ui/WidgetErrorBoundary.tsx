import type { ReactElement, ReactNode } from 'react';
import { ErrorBoundary } from '../errors/ErrorBoundary';
import { WidgetRenderErrorFallback } from './widgetErrors';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
}

/**
 * Aísla fallos de render dentro de un gráfico, tabla o bloque de datos.
 * Errores de API / red deben manejarse con QueryStateView o DataWidget en el mismo contenedor.
 */
export function WidgetErrorBoundary(props: WidgetErrorBoundaryProps): ReactElement {
  const { children } = props;
  return <ErrorBoundary fallback={WidgetRenderErrorFallback}>{children}</ErrorBoundary>;
}
