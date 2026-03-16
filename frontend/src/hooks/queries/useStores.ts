import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '../../services/endpoints';

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
  });
}
