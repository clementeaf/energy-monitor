import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import api from '../../services/api';
import { API_ROUTES } from '../../services/routes';
import type { BuildingSummary } from '../../types/building';

/**
 * Lista de edificios del tenant (API aún no disponible en backend: devolverá error hasta existir el endpoint).
 * @returns Resultado de useQuery con BuildingSummary[]
 */
export function useBuildingsQuery(): UseQueryResult<BuildingSummary[], unknown> {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: async (): Promise<BuildingSummary[]> => {
      const { data } = await api.get<BuildingSummary[]>(API_ROUTES.buildings);
      return data;
    },
  });
}
