import { useQuery } from '@tanstack/react-query';
import { fetchMe, fetchPermissions } from '../../services/endpoints';

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function usePermissions() {
  return useQuery({
    queryKey: ['auth', 'permissions'],
    queryFn: fetchPermissions,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });
}
