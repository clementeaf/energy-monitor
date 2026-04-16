import type { UseQueryResult } from '@tanstack/react-query';

export type QueryUiPhase = 'loading' | 'error' | 'empty' | 'ready';

export interface UseQueryStateOptions<T> {
  /**
   * Devuelve true cuando la respuesta exitosa debe mostrarse como "sin datos"
   * (lista vacía, objeto vacío, null según el dominio).
   */
  isEmpty: (data: T | undefined) => boolean;
}

export interface QueryStateResult<T> {
  phase: QueryUiPhase;
  data: T | undefined;
  error: unknown;
  refetch: () => Promise<unknown>;
}

/**
 * Reduce el resultado de useQuery a una fase de UI: carga, error, vacío o datos listos.
 * @param query - Resultado de useQuery
 * @param options - Función isEmpty acorde al tipo de dato
 * @returns Fase y referencias para QueryStateView
 */
export function useQueryState<T>(
  query: UseQueryResult<T, unknown>,
  options: UseQueryStateOptions<T>,
): QueryStateResult<T> {
  const { isEmpty } = options;
  const { isPending, isError, error, data, refetch, isSuccess } = query;

  if (isPending) {
    return { phase: 'loading', data: undefined, error: undefined, refetch };
  }
  if (isError) {
    return { phase: 'error', data: undefined, error, refetch };
  }
  if (isSuccess && isEmpty(data)) {
    return { phase: 'empty', data, error: undefined, refetch };
  }
  return { phase: 'ready', data, error: undefined, refetch };
}
