import type { ReactElement } from 'react';
import { QueryStateView, type QueryStateViewProps } from './QueryStateView';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';

export type DataWidgetProps = Omit<QueryStateViewProps, 'variant'>;

/**
 * Bloque de datos (tabla, lista, KPI): estados de red/datos en el propio espacio + boundary de render.
 */
export function DataWidget(props: DataWidgetProps): ReactElement {
  return (
    <WidgetErrorBoundary>
      <QueryStateView {...props} variant="widget" />
    </WidgetErrorBoundary>
  );
}
