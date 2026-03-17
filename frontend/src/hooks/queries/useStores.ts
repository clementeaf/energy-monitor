import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStores, fetchStoreTypes, createStore, updateStore, deleteStore, bulkCreateStores } from '../../services/endpoints';
import type { BulkStoreItem } from '../../services/endpoints';

export function useStores() {
  return useQuery({
    queryKey: ['stores'],
    queryFn: fetchStores,
  });
}

export function useStoreTypes() {
  return useQuery({
    queryKey: ['store-types'],
    queryFn: fetchStoreTypes,
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { meterId: string; storeName: string; storeTypeId: number; buildingName: string }) =>
      createStore(data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['meters', 'building', vars.buildingName] });
      qc.invalidateQueries({ queryKey: ['operators', vars.buildingName] });
    },
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ meterId, data }: { meterId: string; data: { storeName?: string; storeTypeId?: number } }) =>
      updateStore(meterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['meters'] });
    },
  });
}

export function useBulkCreateStores() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: BulkStoreItem[]) => bulkCreateStores(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['meters'] });
      qc.invalidateQueries({ queryKey: ['operators'] });
      qc.invalidateQueries({ queryKey: ['store-types'] });
    },
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meterId: string) => deleteStore(meterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stores'] });
      qc.invalidateQueries({ queryKey: ['meters'] });
      qc.invalidateQueries({ queryKey: ['operators'] });
    },
  });
}
