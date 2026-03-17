import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuildings, fetchBuilding, createBuilding, updateBuilding, deleteBuilding } from '../../services/endpoints';

export function useBuildings() {
  return useQuery({
    queryKey: ['buildings'],
    queryFn: fetchBuildings,
  });
}

export function useBuilding(name: string) {
  return useQuery({
    queryKey: ['building', name],
    queryFn: () => fetchBuilding(name),
    enabled: !!name,
  });
}

export function useCreateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { buildingName: string; areaSqm: number }) => createBuilding(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buildings'] }); },
  });
}

export function useUpdateBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: { areaSqm?: number } }) => updateBuilding(name, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buildings'] }); },
  });
}

export function useDeleteBuilding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteBuilding(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['buildings'] }); },
  });
}
